/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  maxWorkers: 1,
  moduleDirectories: ["node_modules", "src"],
  transformIgnorePatterns: ["/node_modules"],
};
