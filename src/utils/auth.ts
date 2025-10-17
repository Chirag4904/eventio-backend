import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
import prisma from "../config/prisma.ts";
import { sendMail } from "../notify/mail.ts";
import { emailOTP, openAPI } from "better-auth/plugins";
import { env } from "../config/env.ts";

export const auth = betterAuth({
  // Use a stable secret so tokens stay valid across restarts
  // If empty, Better Auth may generate a random secret each boot
  // causing existing session cookies to become invalid.
  secret: env.authSecret || undefined,
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),

  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: true,
    // sendResetPassword: async ({user, url, token}, request) => {
    //     await sendMail({
    //         to: user.email,
    //         subject: "Reset your password",
    //         text: `Click the link to reset your password: ${url}`,
    //     });
    // },
  },
  // emailVerification: {
  //     sendVerificationEmail: async ( { user, url, token }, request) => {
  //         await sendMail({
  //             to: user.email,
  //             subject: "Verify your email address",
  //             text: `Click the link to verify your email: ${url}`,
  //         });
  //     },
  //     sendOnSignIn: true,
  //     sendOnSignUp:true,
  //
  // },

  plugins: [
    emailOTP({
      sendVerificationOnSignUp: true,
      otpLength: 4,
      overrideDefaultEmailVerification: true,
      expiresIn: 600,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          // Send the OTP for sign in
        } else if (type === "email-verification") {
          // Send the OTP for email verification
          sendMail({
            to: email,
            subject: "Verify your email address",
            text: `Your OTP for email verification is: ${otp}`,
          }).catch(console.error);
        } else if (type === "forget-password") {
          // Send the OTP for password reset
          sendMail({
            to: email,
            subject: "Reset your password",
            text: `Your OTP for password reset is: ${otp}`,
          }).catch(console.error);
        }
      },
    }),
    openAPI(),
  ],

  // socialProviders:{
  //     google:{
  //
  //     }
  // }
});
