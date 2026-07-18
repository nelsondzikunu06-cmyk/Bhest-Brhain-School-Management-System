import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStudents from "./tools/list-students";
import getGrades from "./tools/get-grades";
import getAttendance from "./tools/get-attendance";
import getFees from "./tools/get-fees";
import listAnnouncements from "./tools/list-announcements";
import createAnnouncement from "./tools/create-announcement";

// Direct Supabase issuer is required (RFC 8414). The `.lovable.cloud` proxy on
// SUPABASE_URL is rejected. Use VITE_SUPABASE_PROJECT_ID, which Vite inlines
// at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bhest-brhain-academy-mcp",
  title: "Bhest Brhain Academy",
  version: "0.1.0",
  instructions:
    "Tools for Bhest Brhain Academy. Admins can list/manage all students; parents see only their own children. Use `list_students` to discover student IDs before querying grades, attendance, or fees.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listStudents,
    getGrades,
    getAttendance,
    getFees,
    listAnnouncements,
    createAnnouncement,
  ],
});
