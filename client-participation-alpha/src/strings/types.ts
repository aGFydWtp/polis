// Define the standard Translation interface based on en_us.ts keys
export interface Translations {
  direction?: "ltr" | "rtl"

  agree: string
  anonPerson: string
  closed: string
  comment_123: string
  commentErrorConversationClosed: string
  commentErrorDuplicate: string
  comments_remaining: string
  commentSendFailed: string
  commentSent: string
  consensus: string
  convIsClosed: string
  copied: string
  copy: string
  couldNotLoadConversation: string
  disagree: string
  dismissWarning: string
  doneWithCount: string
  download_invites_csv: string
  error: string
  failedToSaveTopicSelections: string
  group_123: string
  helpWriteListIntro: string
  helpWriteListRaisNew: string
  helpWriteListShort: string
  helpWriteListStandalone: string
  hideTranslationButton: string
  importantCheckbox: string
  importantCheckboxDesc: string
  infoIconAriaLabel: string
  invite_code_accepted_message_no_code: string
  invite_code_accepted_message: string
  invite_code_invalid: string
  invite_code_prompt: string
  invite_code_required_long: string
  invite_code_required_short: string
  invite_status_expired: string
  invite_status_revoked: string
  invite_status_unused: string
  invite_status_used: string
  invites_instructions: string
  invites_link: string
  invites_none: string
  invites_wave_sentence: string
  loading: string
  login_code_invalid: string
  login_code_prompt: string
  login_success: string
  moreSpecificTopics: string
  notificationsAlreadySubscribed: string
  notificationsEnterEmail: string
  notificationsGetNotified: string
  notificationsSubscribeButton: string
  notificationsSubscribeErrorGeneric: string
  ok_got_it: string
  oops: string
  opinionGroups: string
  or_text: string
  participantHelpWelcomeText: string
  pass: string
  pctAgreedLong: string
  pctAgreedOfGroupLong: string
  pctDisagreedLong: string
  pctDisagreedOfGroupLong: string
  privacy: string
  selectTopics: string
  showTranslationButton: string
  signInToParticipate: string
  signInToVote: string
  submit_invite_code: string
  submit_login_code: string
  submitComment: string
  submitting: string
  superSpecificTopics: string
  tipCommentsRandom: string
  topicSelectionsSavedSuccess: string
  TOS: string
  voteFailedGeneric: string
  writeCommentHelpText: string
  writePrompt: string
  x_wrote: string
  xidOidcConflictWarning: string
  xidRequired: string

  // ─────────────────────────────────────────────────────────────
  // Voting screen v2 (?ui=v2) — mobile bottom-sheet (3c) / desktop dock (4a)
  // ─────────────────────────────────────────────────────────────
  v2HeroTagline: string
  v2VotingProgress: string
  v2RemainingCount: string
  v2VoteCta: string
  v2CtaHint: string
  v2AllAnsweredTitle: string
  v2AllAnsweredBody: string
  v2OpinionGroupsDesc: string
  v2VoteInDockHint: string
  v2GroupLabel: string
  v2MajorOpinion: string
  v2SelectToReact: string
  v2GroupsNotFormed: string
  v2PeopleCount: string
  v2StatReaction: string
  v2StatReactionShort: string
  v2VotingInProgress: string
  v2AllAnsweredShort: string
  v2Pull: string
  v2Close: string
  /** Desktop 5a: opinion-group ⓘ tooltip body; paragraphs split on "\n\n". */
  v2GroupsTooltip: string
  /** Desktop 5a: prompt above the opinion in the vote panel. */
  v2VotePrompt: string
  /** Desktop 5a: collapses the vote panel back to progress + CTA. */
  v2VoteClose: string
  /** Consensus section (6d): heading above the donut cards. */
  v2ConsensusTitle: string
  /** Consensus section (6d): explanatory subtitle under the heading. */
  v2ConsensusSubtitle: string
  /** Consensus section (6d): donut center label shown under the agree %. */
  v2ConsensusCenterAgree: string
  /** Consensus section (6d): parenthesized voter-count format, e.g. "({{n}}人)". */
  v2ConsensusCount: string
}
