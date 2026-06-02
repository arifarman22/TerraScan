/**
 * EXIF / XMP metadata extraction (SRS FR-IMG-007).
 *
 * Uses `exifr` (pure JavaScript) so no external binary or Perl runtime is
 * required. It parses the leading bytes of an image and extracts GPS,
 * camera, and drone XMP fields (DJI gimbal angles, relative altitude).
 */
import { Injectable, Logger } from '@nestjs/common';
import exifr from 'exifr';
import type { ImageMetadata } from '@platform/shared-types';

const EMPTY_METADATA: ImageMetadata = {
  latitude: null,
  longitude: null,
  altitude: null,
  cameraMake: null,
  cameraModel: null,
  focalLengthMm: null,
  sensorWidthMm: null,
  sensorHeightMm: null,
  capturedAt: null,
  gimbalPitchDeg: null,
  gimbalRollDeg: null,
  gimbalYawDeg: null,
  flightAltitudeAglM: null,
};

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

@Injectable()
export class ExifService {
  private readonly logger = new Logger(ExifService.name);

  /** Extract metadata from the leading bytes of an image file. */
  async extract(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const parsed = (await exifr.parse(buffer, {
        gps: true,
        xmp: true,
        tiff: true,
        exif: true,
      })) as Record<string, unknown> | undefined;

      if (!parsed) {
        return { ...EMPTY_METADATA };
      }

      let capturedAt: string | null = null;
      const rawDate = parsed.DateTimeOriginal;
      if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
        capturedAt = rawDate.toISOString();
      } else if (typeof rawDate === 'string') {
        const parsedDate = new Date(rawDate);
        capturedAt = Number.isNaN(parsedDate.getTime())
          ? null
          : parsedDate.toISOString();
      }

      return {
        latitude: asNumber(parsed.latitude),
        longitude: asNumber(parsed.longitude),
        altitude: asNumber(parsed.GPSAltitude),
        cameraMake: asString(parsed.Make),
        cameraModel: asString(parsed.Model),
        focalLengthMm: asNumber(parsed.FocalLength),
        sensorWidthMm: null,
        sensorHeightMm: null,
        capturedAt,
        gimbalPitchDeg: asNumber(parsed.GimbalPitchDegree),
        gimbalRollDeg: asNumber(parsed.GimbalRollDegree),
        gimbalYawDeg: asNumber(parsed.GimbalYawDegree),
        flightAltitudeAglM: asNumber(parsed.RelativeAltitude),
      };
    } catch (error: unknown) {
      this.logger.debug(
        `EXIF extraction skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { ...EMPTY_METADATA };
    }
  }
}
