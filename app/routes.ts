import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("about", "routes/about.tsx"),
  route("lobby", "routes/lobby.tsx"),
  route("rooms/new", "routes/rooms.new.tsx"),
  route("rooms", "routes/rooms.tsx"),
  route("room/:roomId", "routes/room.$roomId.tsx"),
] satisfies RouteConfig;
