import {
  IsString as _IsString,
  IsNotEmpty as _IsNotEmpty,
  IsEmail as _IsEmail,
  IsNumber as _IsNumber,
  MaxLength as _MaxLength,
  MinLength as _MinLength,
  Min as _Min,
  Max as _Max,
  IsArray as _IsArray,
  IsIn as _IsIn,
  IsISO8601 as _IsDateString,
  IsNumberString as _IsNumberString,
  IsPhoneNumber as _IsPhoneNumber,
  IsObject as _IsObject,
  IsBoolean as _IsBoolean,
  ArrayNotEmpty as _ArrayNotEmpty,
  IsNotEmptyObject as _IsNotEmptyObject,
  IsUrl as _IsUrl,
  IsEnum as _IsEnum,
  IsInt as _IsInt,
  IsUUID as _IsUUID,
  IsDate as _IsDate,
  IsNumberOptions,
  ValidationOptions,
  UUIDVersion,
} from 'class-validator';
import { CountryCode } from 'libphonenumber-js';
import { TEMPLATE } from 'src/constants';
import ValidatorJS from 'validator';
type Nullable = { nullable?: boolean };

export const IsNotEmpty = (options?: ValidationOptions) =>
  _IsNotEmpty({
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_NOT_EMPTY(args.property),
  });
export const IsEmail = (
  emailOptions?: ValidatorJS.IsEmailOptions,
  options?: ValidationOptions,
) =>
  _IsEmail(
    { ...emailOptions },
    {
      ...options,
      message: (args) => TEMPLATE.VALIDATION.IS_EMAIL(args.property),
    },
  );
export const IsNumber = (
  numberOptions?: IsNumberOptions,
  options?: ValidationOptions,
) =>
  _IsNumber(
    { ...numberOptions },
    {
      ...options,
      message: (args) => TEMPLATE.VALIDATION.IS_NUMBER(args.property),
    },
  );
export const MinLength = (min: number, options?: ValidationOptions) =>
  _MinLength(min, {
    ...options,
    message: (args) => TEMPLATE.VALIDATION.MIN_LENGTH(args.property, min),
  });
export const MaxLength = (max: number, options?: ValidationOptions) =>
  _MaxLength(max, {
    ...options,
    message: (args) => TEMPLATE.VALIDATION.MAX(args.property, max),
  });
export const IsArray = (options?: ValidationOptions) =>
  _IsArray({
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_ARRAY(args.property),
  });
export const IsNumberString = (
  numericOptions?: ValidatorJS.IsNumericOptions,
  options?: ValidationOptions,
) =>
  _IsNumberString(
    { ...numericOptions },
    {
      ...options,
      message: (args) => TEMPLATE.VALIDATION.IS_NUMBER_STRING(args.property),
    },
  );
export const IsString = (options?: ValidationOptions) =>
  _IsString({
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_STRING(args.property),
  });
export const IsIn = (values: Readonly<string[]>, options?: ValidationOptions) =>
  _IsIn(values, {
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_IN(args.property, values),
  });
export const IsPhoneNumber = (
  region?: CountryCode,
  options?: ValidationOptions,
) =>
  _IsPhoneNumber(region, {
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_PHONE_NUMBER(args.property),
  });
export const IsDateString = (
  dateOptions?: ValidatorJS.IsISO8601Options,
  options?: ValidationOptions,
) =>
  _IsDateString(
    { ...dateOptions },
    {
      ...options,
      message: (args) => TEMPLATE.VALIDATION.IS_DATE_STRING(args.property),
    },
  );
export const IsObject = (options?: ValidationOptions) =>
  _IsObject({
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_OBJECT(args.property),
  });
export const IsBoolean = (options?: ValidationOptions) =>
  _IsBoolean({
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_BOOLEAN(args.property),
  });
export const ArrayNotEmpty = (options?: ValidationOptions) =>
  _ArrayNotEmpty({
    ...options,
    message: (args) => TEMPLATE.VALIDATION.ARRAY_NOT_EMPTY(args.property),
  });
export const Min = (value: number, options?: ValidationOptions) =>
  _Min(value, {
    ...options,
    message: (args) => TEMPLATE.VALIDATION.MIN(args.property, value),
  });
export const Max = (value: number, options?: ValidationOptions) =>
  _Max(value, {
    ...options,
    message: (args) => TEMPLATE.VALIDATION.MAX(args.property, value),
  });
export const IsUrl = (
  urlOptions?: ValidatorJS.IsURLOptions,
  options?: ValidationOptions,
) =>
  _IsUrl(
    { ...urlOptions },
    {
      ...options,
      message: (args) => TEMPLATE.VALIDATION.IS_URL(args.property),
    },
  );
export const IsNotEmptyObject = (
  options?: Nullable,
  validationOptions?: ValidationOptions,
) =>
  _IsNotEmptyObject(
    { ...options },
    {
      ...validationOptions,
      message: (args) => TEMPLATE.VALIDATION.IS_NOT_EMPTY_OBJECT(args.property),
    },
  );
export const IsEnum = (
  entity: object,
  values: string[],
  options?: ValidationOptions,
) =>
  _IsEnum(entity, {
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_ENUM(args.property, values),
  });
export const IsInt = (options?: ValidationOptions) =>
  _IsInt({
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_INT(args.property),
  });
export const IsUUID = (version?: UUIDVersion, options?: ValidationOptions) =>
  _IsUUID(version, {
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_UUID(args.property),
  });
export const IsDate = (options?: ValidationOptions) =>
  _IsDate({
    ...options,
    message: (args) => TEMPLATE.VALIDATION.IS_DATE(args.property),
  });
