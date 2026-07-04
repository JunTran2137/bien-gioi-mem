import type Database from 'better-sqlite3';

export function getDb(): Database.Database;
export function initDatabase(): void;
export function recountGroupMembers(): void;
