export * from './template';
export * from './message';
import { cwd } from 'process';

// See Dockerfile's WORKDIR
const root = cwd() !== '/' ? cwd() : '/usr/src/app';

export const MAX_FILE_SIZE = 1024 * 1024 * 10; // 10mb
export const FILES_PATH = `${root}/files/`;
export const TEST_FILES_PATH = `${root}/test_files/`;
export const SERVER_NAME = 'Insomnia';
export const DAY_IN_SECS = 60 * 60 * 24;
export const HOUR_IN_SECS = 60 * 60 * 1;
export const ITEMS_PER_PAGE = 20;
