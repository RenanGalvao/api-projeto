import { IsString } from "src/utils";

export class RefreshResponseDto {
  @IsString()
  acessToken: string;
  @IsString()
  refreshToken: string;
}
