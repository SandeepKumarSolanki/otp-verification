import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../model/userModel.js';
import transporter from '../config/nodemailer.js';
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';

export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new userModel({ name, email, password: hashedPassword });
        await user.save();
        // console.log(user)
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: `Welcome to our website`,
            text: `Welcome to our website. Your account has been created with email id: ${email}`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(201).json({ success: true });
    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};


export const login = async (req, res) => {
    console.log("Login Page")
    const { email, password } = req.body;
    if (!email || !password) {
        return res.json({ success: false, message: "Email && password are required" });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({
                success: false,
                message: "User does not exist"
            })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.json({
                success: false,
                message: "Invalid credentials"
            })
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.json({ success: true })
    } catch (error) {
        return res.json({ success: false, message: error.message })
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        })
        return res.json({ success: true, message: "Logged Out" })
    } catch (error) {
        return res.json({ success: false, message: error.message })
    }
}

//Send Verification OTP to the User's email 
export const sendVerifyOtp = async (req, res) => {
    try {
      const userId = req.user // ✅ from authenticated user
      const user = await userModel.findById(userId);
      if (!user) {
        return res.json({ success: false, message: "User not found" });
      }
  
      if (user.isAccountVerified) {
        return res.json({ success: false, message: "Account is already verified" });
      }
  
      const otp = String(Math.floor(100000 + Math.random() * 900000));
  
      user.verifyOtp = otp;
      user.verifyOtpExpireAt = Date.now() + 10 * 60 * 60  * 1000; // ✅ 10 minutes
      await user.save();
  
      const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: `Account Verification OTP`,
        html: EMAIL_VERIFY_TEMPLATE.replace('{{otp}}', otp).replace('{{email}}', user.email),
      };
  
      await transporter.sendMail(mailOptions);
  
      return res.status(200).json({ success: true, message: "Verification OTP sent to email" });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: error.message });
    }
  };
  

export const verifyEmail = async (req, res) => {
    const { otp } = req.body;
    const userId = req.user; // ✅ from authenticated user
    console.log("verifyEmail :- ", userId, otp)

    if(!userId || !otp) {
        return res.json({success : false, message : "Missing Details"})
    }

    try {
        const user = await userModel.findById(userId);
        if(!user){
            return res.json({success : false , message: "User not Available"})
        }
        if(user.verifyOtp === '' || user.verifyOtp !== otp){
            return res.json({success : false , message : "Invalid OTP"})
        }
        if(user.verifyOtpExpireAt < Date.now()){
            return res.json({success : false , message : "OTP Expired"})
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

        await user.save();
        return res.json({success : true , message : "Email verified successfully"})
    } catch (error) {
        return res.json({success : false , message : error.message})
    }
}

export const sendResetOtp = async (req, res) => {
    const {email} = req.body;
    
    if(!email){
        return res.json({success : false , message : "Email is required"})
    }
    try {
        const user = await userModel.findOne({email});
        if(!user){
            return res.json({success : false, message : "User not found"})
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000))

        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

        await user.save(); 

        const mailOptions = {
            from : process.env.SENDER_EMAIL,
            to : user.email,
            subject : `Password Reset OTP`,
            // text : `Your OTP for resetting your password is ${otp}. Use this OTP to proceed with resetting your password.`,
            html : PASSWORD_RESET_TEMPLATE.replace('{{otp}}', otp).replace('{{email}}', user.email)
        }
        await transporter.sendMail(mailOptions);
        return res.json({success : true , message : 'OTP send to your email'})
    } catch (error) {
        console.log(error)
        return res.json({success : false , message : error.message})
    }
}
 
//Check if user is authenticated or not
export const isAuthenticated = async (req, res) => {
    try {
        const userId = req.user;
        if(!userId){
            return res.json({success : false, message : "User not authenticated"})
        }
        return res.json({success : true, message : "User is authenticated"})
    } catch (error) {
        console.log(error)
        res.json({success : false, message : error.message})
    }
}

export const resetPassword = async (req, res) => {
    const {email , otp , newPassword} = req.body;
    if(!email || !otp || !newPassword){
        return res.json({success : false , message : "Email , OTP, and new password are required"})
    }

    try {
        const user = await userModel.findOne({email})
        if(!user){
            return res.json({success : false , message : "User not found"})
        }
        if(user.resetOtp === "" || user.resetOtp !== otp){
            return res.json({success : false , message : "Invalid OTP"})
        }
       
        if(user.resetOtpExpireAt < Date.now()){
            return res.json({success : false, message : "OTP Expired"})
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        user.password = hashedPassword;
        user.resetOtp = "";
        user.resetOtpExpireAt = 0;

        await user.save();

        return res.json({success : true , message : "Password reset successfully"})

    } catch (error) {
       console.log(error)
       return res.json({success : false , message : error.message}) 
    }
}







// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import userModel from '../model/userModel.js';
// import transporter from '../config/nodemailer.js';
// import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';

// // Utility function
// const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// // Ensure JWT secret exists
// if (!process.env.JWT_SECRET) {
//   throw new Error("JWT_SECRET is missing in environment variables.");
// }

// export const register = async (req, res) => {
//   const { name, email, password } = req.body;

//   if (!name || !email || !password) {
//     return res.status(400).json({ success: false, message: "All fields are required" });
//   }

//   try {
//     const existingUser = await userModel.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ success: false, message: "User already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = new userModel({ name, email, password: hashedPassword });
//     await user.save();

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     const mailOptions = {
//       from: process.env.SENDER_EMAIL,
//       to: email,
//       subject: "Welcome to our website",
//       text: `Welcome to our website. Your account has been created with email: ${email}`,
//     };

//     await transporter.sendMail(mailOptions);

//     return res.status(201).json({ success: true, user: { id: user._id, name, email } });
//   } catch (error) {
//     console.error("Register Error:", error);
//     return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
//   }
// };

// export const login = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ success: false, message: "Email and password are required" });
//   }

//   try {
//     const user = await userModel.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ success: false, message: "Invalid email or password" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ success: false, message: "Invalid email or password" });
//     }

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     return res.status(200).json({ success: true, user: { id: user._id, name: user.name, email } });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const logout = async (req, res) => {
//   try {
//     res.clearCookie('token', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
//     });
//     return res.status(200).json({ success: true, message: "Logged out successfully" });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const sendVerifyOtp = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const user = await userModel.findById(userId);

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     if (user.isAccountVerified) {
//       return res.status(400).json({ success: false, message: "Account is already verified" });
//     }

//     const otp = generateOtp();
//     user.verifyOtp = otp;
//     user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes
//     await user.save();

//     const mailOptions = {
//       from: process.env.SENDER_EMAIL,
//       to: user.email,
//       subject: "Account Verification OTP",
//       html: EMAIL_VERIFY_TEMPLATE.replace('{{otp}}', otp).replace('{{email}}', user.email),
//     };

//     await transporter.sendMail(mailOptions);

//     return res.status(200).json({ success: true, message: "Verification OTP sent to email" });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const verifyEmail = async (req, res) => {
//   const { otp } = req.body;
//   const userId = req.user?.id;

//   if (!userId || !otp) {
//     return res.status(400).json({ success: false, message: "Missing details" });
//   }

//   try {
//     const user = await userModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     if (!user.verifyOtp || user.verifyOtp !== otp.trim()) {
//       return res.status(400).json({ success: false, message: "Invalid OTP" });
//     }

//     if (user.verifyOtpExpireAt < Date.now()) {
//       return res.status(400).json({ success: false, message: "OTP expired" });
//     }

//     user.isAccountVerified = true;
//     user.verifyOtp = null;
//     user.verifyOtpExpireAt = null;
//     await user.save();

//     return res.status(200).json({ success: true, message: "Email verified successfully" });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const sendResetOtp = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ success: false, message: "Email is required" });
//   }

//   try {
//     const user = await userModel.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const otp = generateOtp();
//     user.resetOtp = otp;
//     user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
//     await user.save();

//     const mailOptions = {
//       from: process.env.SENDER_EMAIL,
//       to: user.email,
//       subject: "Password Reset OTP",
//       html: PASSWORD_RESET_TEMPLATE.replace('{{otp}}', otp).replace('{{email}}', user.email),
//     };

//     await transporter.sendMail(mailOptions);
//     return res.status(200).json({ success: true, message: "OTP sent to your email" });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const resetPassword = async (req, res) => {
//   const { email, otp, newPassword } = req.body;

//   if (!email || !otp || !newPassword) {
//     return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
//   }

//   try {
//     const user = await userModel.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     if (!user.resetOtp || user.resetOtp !== otp.trim()) {
//       return res.status(400).json({ success: false, message: "Invalid OTP" });
//     }

//     if (user.resetOtpExpireAt < Date.now()) {
//       return res.status(400).json({ success: false, message: "OTP expired" });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;
//     user.resetOtp = null;
//     user.resetOtpExpireAt = null;
//     await user.save();

//     return res.status(200).json({ success: true, message: "Password reset successfully" });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const isAuthenticated = async (req, res) => {
//   try {
//     return res.status(200).json({ success: true, message: "User is authenticated" });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
