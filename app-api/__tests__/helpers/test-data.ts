import { faker } from '@faker-js/faker';

export const randomUserId = (): string => faker.internet.email();

export const randomUserIds = (count: number): string[] =>
  Array.from({ length: count }, () => randomUserId());
