import userModel from '../model/userModel.js';

export const getUserData = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
    }

    const userId = req.user.id;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      userData: {
        name: user.name,
        isAccountVerified: user.isAccountVerified,
      },
    });
  } catch (error) {
    console.error("GetUserData Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
