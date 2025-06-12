const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Book = require("./models/Book");
const Member = require("./models/Member");
const Borrowing = require("./models/Borrowing");

const SECRET = "librarySecret";

const typeDefs = gql`
  type Book {
    id: ID!
    title: String!
    author: String!
    isbn: String!
    availableCopies: Int
    category: String
  }

  type Member {
    id: ID!
    name: String!
    email: String!
    membershipNumber: String
    joinDate: String
  }

  type Borrowing {
    id: ID!
    book: Book!
    member: Member!
    borrowDate: String
    returnDate: String
    returned: Boolean
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input BookInput {
    title: String!
    author: String!
    isbn: String!
    availableCopies: Int
    category: String
  }

  input BorrowInput {
    bookId: ID!
  }

  type AuthPayload {
    token: String!
    member: Member!
  }

  type Query {
    books: [Book]
    book(id: ID!): [Book]
    borrowing: [Borrowing]
    availableBooks: [Book!]!
    members: [Member!]!
    member(id: ID!): Member
    me: Member
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload
    login(input: LoginInput!): AuthPayload
    addBook(input: BookInput!): Book
    borrowBook(input: BorrowInput!): Borrowing
    returnBook(borrowingId: ID!): Borrowing
  }
`;

const resolvers = {
  Query: {
    books: () => Book.find(),
    book: (_, { id }) => Book.findById(id),
    availableBooks: () => Book.find({ availableCopies: { $gt: 0 } }),
    members: () => Member.find(),
    borrowing: () => Borrowing.find().populate("book").populate("member"),
    me: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return Member.findById(user.id);
    },
  },
  Mutation: {
    register: async (_, { input }) => {
      const existing = await Member.findOne({ email: input.email });
      if (existing) throw new Error("Email already registered");
      const hashed = await bcrypt.hash(input.password, 10);
      const member = await new Member({
        name: input.name,
        email: input.email,
        password: hashed,
        membershipNumber: Math.random().toString().slice(2, 10),
      }).save();

      const token = jwt.sign({ memberId: member.id }, SECRET);
      return { token, member };
    },
    login: async (_, { input }) => {
      const member = await Member.findOne({ email: input.email });
      if (!member) throw new Error("Invalid credentials");
      const valid = await bcrypt.compare(input.password, member.password);
      if (!valid) throw new Error("Invalid credentials");

      const token = jwt.sign({ memberId: member.id }, SECRET);
      return { token, member };
    },
    addBook: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const book = new Book({
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        availableCopies: input.availableCopies,
        category: input.category,
      });
      return book.save();
    },
    borrowBook: async (_, { bookId }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const book = await Book.findById(bookId);
      if (!book || book.availableCopies < 1)
        throw new Error("Book not available");
      const existing = await Borrowing.findOne({
        book: bookId,
        member: user.id,
        returned: false,
      });
      if (existing) throw new Error("Book already borrowed");
      book.availableCopies -= 1;
      await book.save();
      const borrowing = new Borrowing({ book: bookId, member: user.id });
      return borrowing.save();
    },

    returnBook: async (_, { borrowingId }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const borrowing = await Borrowing.findById(borrowingId).populate("book");
      if (!borrowing || borrowing.returned)
        throw new Error("Invalid operation");
      borrowing.returned = true;
      borrowing.returnDate = new Date();
      await borrowing.save();
      borrowing.book.availableCopies += 1;
      await borrowing.book.save();
      return borrowing;
    },
  },
};

async function start() {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const auth = req.headers.authorization || "";
      if (auth.startsWith("Bearer ")) {
        try {
          const token = auth.split(" ")[1];
          const decoded = jwt.verify(token, SECRET);
          return { memberId: decoded.memberId };
        } catch {
          return {};
        }
      }
      return {};
    },
  });

  await server.start();
  server.applyMiddleware({ app });

  await mongoose.connect(
    "mongodb+srv://mariem:mariem2002@cluster0.qgg7s.mongodb.net/library"
  );
  console.log("MongoDB Connected");

  app.listen(4000, () =>
    console.log("Server ready at http://localhost:4000/graphql")
  );
}

start();
