import { jest } from "@jest/globals";
import { Readable } from "stream";

jest.mock("../../src/db/pg-query", () => ({
  __esModule: true,
  default: {
    queryP: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock("../../src/config", () => ({
  __esModule: true,
  default: {
    AWS_S3_ENDPOINT: undefined,
    AWS_REGION: "us-east-1",
    AWS_ACCESS_KEY_ID: "test-key",
    AWS_SECRET_ACCESS_KEY: "test-secret",
    AWS_S3_BUCKET_NAME: "test-bucket",
    mathEnv: "dev",
    polisFromAddress: "Polis <no-reply@polis.test>",
  },
}));

jest.mock("../../src/email/senders", () => ({
  __esModule: true,
  sendTextEmail: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../src/utils/logger");

jest.mock("@aws-sdk/client-s3", () => {
  const send = jest.fn();
  return {
    __esModule: true,
    S3Client: jest.fn(() => ({ send })),
    GetObjectCommand: jest.fn((input: any) => ({ commandType: "get", input })),
    DeleteObjectCommand: jest.fn((input: any) => ({
      commandType: "delete",
      input,
    })),
  };
});

import pg from "../../src/db/pg-query";
import {
  processImportJob,
  triggerMathRecalc,
  s3Client,
} from "../../src/workers/import-processor";

const queryPMock = pg.queryP as jest.Mock;
const connectMock = pg.connect as jest.Mock;
const s3SendMock = s3Client.send as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  queryPMock.mockImplementation(() => Promise.resolve([]));
});

describe("triggerMathRecalc", () => {
  it("enqueues an update_math recompute worker task with the configured math_env", async () => {
    await triggerMathRecalc(123);

    const workerTaskCall = queryPMock.mock.calls.find(([sql]) =>
      (sql as string).includes("worker_tasks"),
    );
    expect(workerTaskCall).toBeDefined();
    const [sql, params] = workerTaskCall as [string, any[]];
    expect(sql).toContain("'update_math'");
    expect(JSON.parse(params[0])).toEqual({
      zid: 123,
      math_update_type: "recompute",
    });
    expect(params[1]).toBe(123); // task_bucket
    expect(params[2]).toBe("dev"); // math_env from config, not hardcoded 'prod'
  });

  it("does not rely on math_ticks, which the math service never reads as a trigger", async () => {
    await triggerMathRecalc(123);

    const mathTicksCalls = queryPMock.mock.calls.filter(([sql]) =>
      (sql as string).includes("math_ticks"),
    );
    expect(mathTicksCalls).toHaveLength(0);
  });

  it("bumps conversations.modified", async () => {
    await triggerMathRecalc(123);

    const conversationsCall = queryPMock.mock.calls.find(([sql]) =>
      (sql as string).includes("UPDATE conversations SET modified"),
    );
    expect(conversationsCall).toBeDefined();
    expect((conversationsCall as [string, any[]])[1]).toEqual([123]);
  });
});

describe("processImportJob", () => {
  const HISTORICAL_TS_1 = Date.parse("2025-06-01T00:00:00.000Z");
  const HISTORICAL_TS_2 = Date.parse("2025-06-02T00:00:00.000Z");

  const csv = [
    "vote_id,user_id,vote_value,timestamp,comment_id",
    "v1,alice,1,2025-06-01T00:00:00.000Z,c-abc",
    "v2,bob,-1,2025-06-02T00:00:00.000Z,c-abc",
  ].join("\n");

  let clientQueryMock: jest.Mock;

  beforeEach(() => {
    queryPMock.mockImplementation((...args: any[]) => {
      const sql = args[0] as string;
      if (sql.includes("SELECT tid, original_id")) {
        return Promise.resolve([{ tid: 7, original_id: "c-abc" }]);
      }
      return Promise.resolve([]);
    });

    clientQueryMock = jest.fn((...args: any[]) => {
      const sql = args[0] as string;
      if (typeof sql === "string" && sql.includes("SELECT p.pid")) {
        return Promise.resolve({
          rows: [
            { pid: 11, username: "alice" },
            { pid: 12, username: "bob" },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    connectMock.mockImplementation(() =>
      Promise.resolve({ query: clientQueryMock, release: jest.fn() }),
    );

    s3SendMock.mockImplementation((command: any) => {
      if (command.commandType === "get") {
        return Promise.resolve({ Body: Readable.from([csv]) });
      }
      return Promise.resolve({});
    });
  });

  async function runJob() {
    await processImportJob({
      jobId: 55,
      zid: 123,
      s3Key: "imports/test.csv",
      email: "user@example.com",
    });
  }

  it("preserves the historical CSV timestamps on inserted votes", async () => {
    await runJob();

    const votesInsert = clientQueryMock.mock.calls.find(
      ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO votes"),
    );
    expect(votesInsert).toBeDefined();
    const params = (votesInsert as any[])[1];
    // [zid, pids, tids, votes, timestamps]
    expect(params[0]).toBe(123);
    expect(params[1]).toEqual([11, 12]);
    expect(params[4]).toEqual([HISTORICAL_TS_1, HISTORICAL_TS_2]);
  });

  it("enqueues an update_math recompute task after the votes are written", async () => {
    await runJob();

    const workerTaskIndex = queryPMock.mock.calls.findIndex(([sql]) =>
      (sql as string).includes("worker_tasks"),
    );
    expect(workerTaskIndex).toBeGreaterThanOrEqual(0);
    const [, params] = queryPMock.mock.calls[workerTaskIndex] as [
      string,
      any[],
    ];
    expect(JSON.parse(params[0])).toEqual({
      zid: 123,
      math_update_type: "recompute",
    });
    expect(params[2]).toBe("dev");

    // The recompute task must be enqueued only after the votes INSERT has run,
    // so the math service's rebuild sees the imported rows.
    const votesInsertIndex = clientQueryMock.mock.calls.findIndex(
      ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO votes"),
    );
    expect(votesInsertIndex).toBeGreaterThanOrEqual(0);
    const votesInsertOrder =
      clientQueryMock.mock.invocationCallOrder[votesInsertIndex];
    const workerTaskOrder =
      queryPMock.mock.invocationCallOrder[workerTaskIndex];
    expect(workerTaskOrder).toBeGreaterThan(votesInsertOrder);
  });

  it("marks the job as completed", async () => {
    await runJob();

    const completedCall = queryPMock.mock.calls.find(([sql]) =>
      (sql as string).includes("status = 'completed'"),
    );
    expect(completedCall).toBeDefined();
    expect((completedCall as [string, any[]])[1]).toEqual([55]);
  });
});
