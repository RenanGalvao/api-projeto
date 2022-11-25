import { FileValidator, MaxFileSizeValidatorOptions } from '@nestjs/common';
import { TEMPLATE } from 'src/constants';

export class MaxFilesSizeValidator extends FileValidator<MaxFileSizeValidatorOptions> {
  buildErrorMessage(): string {
    return TEMPLATE.PIPES.MAX_FILES_SIZE(this.validationOptions.maxSize);
  }

  public isValid(files: Express.Multer.File[]): boolean {
    if (!this.validationOptions) {
      return true;
    }

    for (const file of files) {
      if (file.size > this.validationOptions.maxSize) {
        return false;
      }
    }
    return true;
  }
}
