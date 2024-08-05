// const nodemailer = require("nodemailer");
// const config = require("../config/config");
// const { sendErrorResponse, sendSuccessResponse } = require("./errorResponseHelpers");

// // Configure the transporter
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         user: config.EMAIL_USER,
//         pass: config.EMAIL_PASS
//     }
// });

// // Function to send a password reset email
// const sendPasswordResetEmail = (userEmail, resetToken, host, res) => {
//     const mailOptions = {
//         from: config.EMAIL_USER,
//         to: userEmail,
//         subject: "Password Reset",
//         text: `You are receiving this because you (or someone else) have requested to reset the password for your account.\n\n
//         Please click on the following link, or paste it into your browser to complete the process:\n\n
//         http://${host}/reset/${resetToken}\n\n
//         If you did not request this, please ignore this email and your password will remain unchanged.\n`
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//         if (error) {
//             console.log(error);
//             return sendErrorResponse(res, 500, "Error sending email", [error.message]);
//         }
//         console.log("Email sent: " + info.response);
//         sendSuccessResponse(res, 200, "Password reset email sent successfully", {});
//     });
// };

// module.exports = sendPasswordResetEmail;

// Legacy code for emailing password reset.
// Approach altered to security questions, however could be reinstated.