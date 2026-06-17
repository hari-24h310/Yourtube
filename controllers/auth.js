import mongoose from "mongoose";
import users from "../Models/Auth.js";

export const login = async (req, res) => {
  const { email, firebaseUid, name, displayName, image } = req.body;
  const resolvedName = displayName || name || (email ? email.split("@")[0] : "User");
  const resolvedImage = image || "https://github.com/shadcn.png";

  if (!email && !firebaseUid) {
    return res.status(400).json({ message: "Email or Firebase UID is required" });
  }

  try {
    const lookupQuery = email ? { email } : { firebaseUid };
    const existingUser = await users.findOne(lookupQuery);

    if (!existingUser) {
      const newUser = await users.create({
        email,
        firebaseUid,
        name: resolvedName,
        displayName: resolvedName,
        image: resolvedImage,
        authMethod: firebaseUid ? "google" : "email",
      });
      return res.status(201).json({ result: newUser });
    } else {
      const updates = {};
      if (firebaseUid && !existingUser.firebaseUid) {
        updates.firebaseUid = firebaseUid;
      }
      if (resolvedName && !existingUser.displayName) {
        updates.displayName = resolvedName;
      }
      if (resolvedImage && !existingUser.image) {
        updates.image = resolvedImage;
      }

      if (Object.keys(updates).length > 0) {
        const updatedUser = await users.findByIdAndUpdate(
          existingUser._id,
          { $set: updates },
          { new: true }
        );
        return res.status(200).json({ result: updatedUser });
      }

      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
