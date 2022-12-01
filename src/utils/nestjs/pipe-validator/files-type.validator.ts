import { FileValidator, FileTypeValidatorOptions } from '@nestjs/common';
import { TEMPLATE } from 'src/constants';

export class FilesTypeValidator extends FileValidator<FileTypeValidatorOptions> {
  buildErrorMessage(): string {
    return TEMPLATE.PIPES.FILES_TYPE(this.validationOptions.fileType);
  }

  isValid(files: Express.Multer.File[]): boolean {
    if (!this.validationOptions) {
      return true;
    }

    for (const file of files) {
      if (!file.mimetype) {
        return false;
      }

      if (!Boolean(file.mimetype.match(this.validationOptions.fileType))) {
        return false;
      }
    }
    return true;
  }
}
