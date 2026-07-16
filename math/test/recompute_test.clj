;; Copyright (C) 2012-present, The Authors. This program is free software: you can redistribute it and/or  modify it under the terms of the GNU Affero General Public License, version 3, as published by the Free Software Foundation. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.

(ns recompute-test
  "Tests for the full-recompute path used to pick up votes whose created timestamps fall outside
  the vote poller's polling window (e.g. BYOD imports of historical data)."
  (:use test-helpers)
  (:require [clojure.test :refer :all]
            [clojure.core.async :as async]
            [polismath.conv-man :as conv-man]
            [polismath.tasks :as tasks]
            [polismath.math.named-matrix :as nm]
            [polismath.components.postgres :as db]))


(defn- dispatch-update-math!
  "Dispatch an update_math task with the given task_data, capturing what gets queued to the
  conversation manager. Returns the vector of [message-type zid batch] captures."
  [task-data]
  (let [queued (atom [])]
    (with-redefs [conv-man/queue-message-batch!
                  (fn [_ message-type zid batch]
                    (swap! queued conj [message-type zid batch]))]
      ;; dispatch-task! runs its body on an async thread; block until it completes
      (async/<!! (tasks/dispatch-task! {:conversation-manager ::fake}
                                       {:task_type :update_math
                                        :task_data task-data}))
      @queued)))


(deftest update-math-dispatch-test
  (testing "update_math with math_update_type recompute queues a :recompute message"
    (is (= [[:recompute 42 []]]
           (dispatch-update-math! {:zid 42 :math_update_type "recompute"}))))
  (testing "update_math without a recompute type queues an incremental :votes message"
    (is (= [[:votes 42 []]]
           (dispatch-update-math! {:zid 42})))))


(deftest recompute-rebuilds-from-database-test
  (testing ":recompute rebuilds the conversation from all votes in the database, ignoring in-memory state"
    (let [db-votes [{:zid 0 :pid 0 :tid 0 :vote -1 :created 1000}
                    {:zid 0 :pid 1 :tid 0 :vote  1 :created 2000}
                    {:zid 0 :pid 1 :tid 1 :vote -1 :created 3000}
                    {:zid 0 :pid 2 :tid 1 :vote  1 :created 4000}]
          db-mods  [{:tid 2 :mod -1 :is_meta false :modified 5000}]
          polled-from (atom nil)]
      (with-redefs [db/conv-poll (fn [_ _zid last-ts]
                                   (reset! polled-from last-ts)
                                   db-votes)
                    db/conv-mod-poll (fn [_ _zid _last-ts] db-mods)
                    db/upload-math-profile (fn [& _] nil)]
        ;; The in-memory conv is empty/stale; the recompute should only use its :zid
        (let [updated (conv-man/react-to-messages {:postgres ::fake-postgres :config {}}
                                                  {:zid 0}
                                                  :recompute
                                                  [])]
          (is (= 0 @polled-from)
              "recompute must poll votes from timestamp 0, not from a recent watermark")
          (is (m=? [[-1  nil]
                    [ 1  -1]
                    [nil  1]]
                   (-> updated :raw-rating-mat nm/get-matrix))
              "the rebuilt conversation should contain all votes from the database")
          (is (= 4000 (:last-vote-timestamp updated)))
          (is (contains? (:mod-out updated) 2)
              "moderation data should also be reloaded from the database"))))))


(defn -main []
  (run-tests 'recompute-test))
