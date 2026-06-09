import { faker } from '@faker-js/faker';

export const randomUserId = (): string => faker.internet.email({ allowSpecialCharacters: true });

export const randomUserIds = (count: number): string[] =>
  Array.from({ length: count }, () => randomUserId());
