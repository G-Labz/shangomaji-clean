// Phase 1 — Creator Public Profile editor.
//
// /workspace/profile/public is a clarity alias for the public profile editor.
// The profile editor at /workspace/profile already manages all creator-public
// fields (display name, handle, bio, avatar, banner, website, external links,
// publish state). This route renders the same component so any link or
// navigation pointing at /workspace/profile/public Just Works without
// duplicating UI.

export { default } from "../page";
