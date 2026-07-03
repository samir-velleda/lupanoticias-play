import type { Media } from '@/types';

/**
 * Enquanto não há assets reais (MediaConvert HLS / IVS), usamos streams HLS públicos
 * de teste para o player tocar de verdade. Quando o `playbackUrl` real chegar
 * (prompts 05/07), estes fallbacks deixam de ser usados. NÃO é Mux — é só um .m3u8 público.
 */
export const TEST_HLS_VOD =
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';
export const TEST_HLS_LIVE = TEST_HLS_VOD;

const PLACEHOLDER_HOSTS = ['exemplo.cloudfront.net'];

/** URL efetiva para o <video>: real se disponível, senão um HLS de teste. */
export function playableSrc(media: Pick<Media, 'playbackUrl' | 'tipo'>): string {
  const url = media.playbackUrl ?? '';
  const isPlaceholder = !url || PLACEHOLDER_HOSTS.some((h) => url.includes(h));
  if (isPlaceholder) {
    return media.tipo === 'live' ? TEST_HLS_LIVE : TEST_HLS_VOD;
  }
  return url;
}
