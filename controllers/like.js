import video from "../Models/video.js";
import like from "../Models/like.js";
import dislike from "../Models/dislike.js";

export const getVoteStatus = async (req, res) => {
  const { userId, videoId } = req.params;
  try {
    // Check if user has liked this video
    const userLike = await like.findOne({ viewer: userId, videoid: videoId });
    // Check if user has disliked this video
    const userDislike = await dislike.findOne({ viewer: userId, videoid: videoId });

    return res.status(200).json({
      isLiked: !!userLike,
      isDisliked: !!userDislike,
    });
  } catch (error) {
    console.error("Error checking vote status:", error);
    return res.status(500).json({ message: "Failed to check vote status" });
  }
};

export const handlelike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    const searchQuery = { videoid: videoId, viewer: userId };

    const existinglike = await like.findOne(searchQuery);
    
    if (existinglike) {
      // User already liked - remove the like (toggle off)
      await like.findByIdAndDelete(existinglike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      return res.status(200).json({ liked: false });
    } else {
      // Create new like and remove any existing dislike
      await like.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
      
      // Remove dislike if exists
      const existingDislike = await dislike.findOne({ viewer: userId, videoid: videoId });
      if (existingDislike) {
        await dislike.findByIdAndDelete(existingDislike._id);
        await video.findByIdAndUpdate(videoId, { $inc: { Dislike: -1 } });
      }
      
      return res.status(200).json({ liked: true });
    }
  } catch (error) {
    console.error("Error handling like:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handledislike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    const searchQuery = { videoid: videoId, viewer: userId };

    const existingdislike = await dislike.findOne(searchQuery);
    
    if (existingdislike) {
      // User already disliked - remove the dislike (toggle off)
      await dislike.findByIdAndDelete(existingdislike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Dislike: -1 } });
      return res.status(200).json({ disliked: false });
    } else {
      // Create new dislike and remove any existing like
      await dislike.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Dislike: 1 } });
      
      // Remove like if exists
      const existingLike = await like.findOne({ viewer: userId, videoid: videoId });
      if (existingLike) {
        await like.findByIdAndDelete(existingLike._id);
        await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      }
      
      return res.status(200).json({ disliked: true });
    }
  } catch (error) {
    console.error("Error handling dislike:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
