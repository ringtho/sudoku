import { route } from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/about", "routes/about.tsx"),
  route("/lobby", "routes/lobby.tsx"),
  route("/rooms/new", "routes/rooms.new.tsx"),
  route("/rooms", "routes/rooms.tsx"),
  route("/room/:roomId", "routes/room.$roomId.tsx"),
  route("/invite/:roomId/:inviteId", "routes/invite.$roomId.$inviteId.tsx"),
  route("/admin", "routes/admin.tsx"),
];
