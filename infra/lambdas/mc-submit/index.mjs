/**
 * lupa-mc-submit — disparado pelo EventBridge (s3:ObjectCreated em lupa-uploads-<env>).
 * Cria um job MediaConvert HLS multi-bitrate (1080/720/480/360) + poster (frame capture).
 * O mediaId vem do caminho da chave: uploads/<mediaId>/<arquivo>. Grava mediaId em
 * UserMetadata p/ o lupa-mc-complete vincular ao registro de mídia no Aurora.
 */
import {
  MediaConvertClient,
  CreateJobCommand,
  DescribeEndpointsCommand,
} from '@aws-sdk/client-mediaconvert';

const REGION = process.env.AWS_REGION || 'us-east-1';
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;
const MC_ROLE_ARN = process.env.MC_ROLE_ARN;
const MC_QUEUE_ARN = process.env.MC_QUEUE_ARN;

let _client;
async function mcClient() {
  if (_client) return _client;
  // MediaConvert usa endpoint específico da conta; descobre uma vez e cacheia.
  const disco = new MediaConvertClient({ region: REGION });
  const res = await disco.send(new DescribeEndpointsCommand({}));
  const endpoint = res.Endpoints?.[0]?.Url;
  _client = new MediaConvertClient({ region: REGION, endpoint });
  return _client;
}

/** Uma rendição HLS H.264 (QVBR) + áudio AAC muxado. */
function rendition(height, width, maxBitrate) {
  return {
    NameModifier: `_${height}p`,
    ContainerSettings: { Container: 'M3U8', M3u8Settings: {} },
    VideoDescription: {
      Width: width,
      Height: height,
      ScalingBehavior: 'DEFAULT',
      CodecSettings: {
        Codec: 'H_264',
        H264Settings: {
          RateControlMode: 'QVBR',
          MaxBitrate: maxBitrate,
          QvbrSettings: { QvbrQualityLevel: 7 },
          SceneChangeDetect: 'TRANSITION_DETECTION',
          GopSize: 2,
          GopSizeUnits: 'SECONDS',
          CodecProfile: 'MAIN',
          CodecLevel: 'AUTO',
        },
      },
    },
    AudioDescriptions: [
      {
        CodecSettings: {
          Codec: 'AAC',
          AacSettings: {
            Bitrate: 96000,
            CodingMode: 'CODING_MODE_2_0',
            SampleRate: 48000,
          },
        },
      },
    ],
  };
}

function buildJob({ bucket, key, mediaId }) {
  return {
    Role: MC_ROLE_ARN,
    Queue: MC_QUEUE_ARN,
    StatusUpdateInterval: 'SECONDS_60',
    UserMetadata: { mediaId },
    Settings: {
      TimecodeConfig: { Source: 'ZEROBASED' },
      Inputs: [
        {
          FileInput: `s3://${bucket}/${key}`,
          TimecodeSource: 'ZEROBASED',
          VideoSelector: {},
          AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
        },
      ],
      OutputGroups: [
        {
          Name: 'HLS',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              Destination: `s3://${MEDIA_BUCKET}/media/${mediaId}/hls/video`,
              SegmentLength: 6,
              MinSegmentLength: 0,
              DirectoryStructure: 'SINGLE_DIRECTORY',
              ManifestDurationFormat: 'INTEGER',
            },
          },
          Outputs: [
            rendition(1080, 1920, 5000000),
            rendition(720, 1280, 3000000),
            rendition(480, 854, 1500000),
            rendition(360, 640, 800000),
          ],
        },
        {
          Name: 'Poster',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: `s3://${MEDIA_BUCKET}/media/${mediaId}/poster/poster`,
            },
          },
          Outputs: [
            {
              ContainerSettings: { Container: 'RAW' },
              VideoDescription: {
                Width: 1280,
                Height: 720,
                CodecSettings: {
                  Codec: 'FRAME_CAPTURE',
                  FrameCaptureSettings: {
                    FramerateNumerator: 1,
                    FramerateDenominator: 5,
                    MaxCaptures: 1,
                    Quality: 80,
                  },
                },
              },
            },
          ],
        },
      ],
    },
  };
}

export const handler = async (event) => {
  const rawKey = event?.detail?.object?.key;
  const bucket = event?.detail?.bucket?.name;
  if (!rawKey || !bucket) {
    console.log('evento sem bucket/key; ignorando', JSON.stringify(event));
    return;
  }
  const key = decodeURIComponent(String(rawKey).replace(/\+/g, ' '));
  const m = key.match(/^uploads\/([^/]+)\//);
  if (!m) {
    console.log('chave fora do padrão uploads/<mediaId>/; ignorando:', key);
    return;
  }
  const mediaId = m[1];
  const mc = await mcClient();
  const out = await mc.send(new CreateJobCommand(buildJob({ bucket, key, mediaId })));
  console.log('job MediaConvert criado', { mediaId, jobId: out.Job?.Id, key });
};
