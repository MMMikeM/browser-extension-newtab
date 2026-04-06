export type TestUser = {
  name: string;
  username: string;
  password: string;
};

/** Dedicated e2e test accounts — created on first run via getOrCreateUser(). */
export const USER_1: TestUser = {
  name: "Alice E2E",
  username: "e2e_alice",
  password: "e2e-password-alice-99",
};

export const USER_2: TestUser = {
  name: "Bob E2E",
  username: "e2e_bob",
  password: "e2e-password-bob-99",
};
