import * as fs from 'fs';
import { TEST_FILES_PATH } from 'src/constants';

export class JestUtils {
  static sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  // Create Empty File
  static createFile(fileName: string, size: number): Promise<string> {
    return new Promise((res) => {
      const path = `${TEST_FILES_PATH}${fileName}`;
      if (!fs.existsSync(TEST_FILES_PATH)) {
        fs.mkdirSync(TEST_FILES_PATH);
      }

      const fh = fs.openSync(path, 'w');
      fs.writeSync(fh, 'ok', Math.max(0, size - 'ok'.length));
      fs.closeSync(fh);
      res(path);
    });
  }
}
