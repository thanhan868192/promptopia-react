import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import User from "@models/user";
import { connectToDB } from "@utils/database";

console.log({
  clientId: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async session({ session }) {
      const sessionUser = await User.findOne({
        email: session.user.email,
      });
      session.user.id = sessionUser._id.toString();

      return session;
    },

    async signIn({ profile }) {
      try {
        await connectToDB();

        // check if a user already exists
        const userExists = await User.findOne({
          email: profile.email,
        });

        // if not, create a new user
        if (!userExists) {
          // chuẩn hóa username
          let baseUsername = profile.name
            .replace(/\s+/g, "") // bỏ hết khoảng trắng
            .replace(/[^a-zA-Z0-9]/g, "") // chỉ giữ chữ + số
            .toLowerCase();

          if (baseUsername.length < 8) {
            baseUsername = baseUsername.padEnd(8, "0"); // thiếu thì thêm số 0
          } else if (baseUsername.length > 20) {
            baseUsername = baseUsername.slice(0, 20); // cắt bớt
          }

          let username = baseUsername;
          let exists = await User.findOne({ username });
          let counter = 1;
          while (exists) {
            username = `${baseUsername}${counter}`;
            if (username.length > 20) {
              username = username.slice(0, 20); // đảm bảo không vượt quá 20
            }
            exists = await User.findOne({ username });
            counter++;
          }

          await User.create({
            email: profile.email,
            username,
            image: profile.picture,
          });
        }

        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
  },
});

export { handler as GET, handler as POST };
