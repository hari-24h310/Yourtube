import express from "express";
import { handlelike, handledislike, getallLikedVideo, getVoteStatus } from "../controllers/like.js";

const routes = express.Router();
routes.post("/dislike/:videoId", handledislike);
routes.get("/status/:videoId/:userId", getVoteStatus);
routes.post("/:videoId", handlelike);
routes.get("/:userId", getallLikedVideo);
export default routes;
