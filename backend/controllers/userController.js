import userModel from '../model/userModel.js';

export const getUserData = async (req, res) => {
  try {
    const userId = req.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
    }

    
    console.log("UserId:", userId);
    const user = await userModel.findById(userId);
    console.log(user);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not availabe" });
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
