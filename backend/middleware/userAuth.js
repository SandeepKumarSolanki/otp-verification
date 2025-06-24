import jwt from 'jsonwebtoken';

const userAuth = async (req, res, next) => {


  try {
    const { token } = req.cookies;

    if (!token) {
      return res.json({ success: false, message: "Not Authorized. Please login." });
    }
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(tokenDecode);
    if (tokenDecode.id) {
      req.user = { id: tokenDecode.id };
      next();
    } else {
      return res.json({ success: false, message: "Not Authorized login again" })
    }


  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export default userAuth;
