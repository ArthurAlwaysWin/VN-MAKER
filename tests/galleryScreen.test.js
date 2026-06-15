/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GalleryScreen } from '../src/ui/GalleryScreen.js';
import { TitleScreen } from '../src/ui/TitleScreen.js';

describe('runtime CG gallery', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="game"></div>';
    vi.stubGlobal('requestAnimationFrame', (callback) => callback());
  });

  it('shows unlocked artwork while leaving locked entries concealed', () => {
    const screen = new GalleryScreen(document.getElementById('game'));
    screen.show({
      confession: {
        title: 'Confession',
        images: ['backgrounds/cg/confession.png'],
        thumbnail: 'backgrounds/cg/confession-thumb.png',
      },
      secret: {
        title: 'Secret',
        images: ['backgrounds/cg/secret.png'],
        lockedThumbnail: 'ui/gallery/locked.png',
      },
    }, {
      confession: { count: 1 },
    });

    const cards = screen.el.querySelectorAll('.gallery-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].classList.contains('unlocked')).toBe(true);
    expect(cards[1].classList.contains('locked')).toBe(true);
    expect(cards[1].textContent).toContain('LOCKED');
    cards[0].click();
    expect(screen.el.querySelector('.gallery-focus-title').textContent).toBe('Confession');
  });

  it('navigates all images of an unlocked multi-image CG', () => {
    const screen = new GalleryScreen(document.getElementById('game'));
    screen.show({
      confession: {
        title: 'Confession',
        images: ['backgrounds/cg/first.png', 'backgrounds/cg/second.png'],
      },
    }, {
      confession: { count: 1 },
    });

    screen.el.querySelector('.gallery-card').click();
    expect(screen.el.querySelector('.gallery-focus-image img').getAttribute('src')).toContain('first.png');
    expect(screen.el.querySelector('.gallery-position').textContent).toBe('1 / 2');
    expect(screen.el.querySelector('.gallery-nav-prev').disabled).toBe(true);

    screen.el.querySelector('.gallery-nav-next').click();
    expect(screen.el.querySelector('.gallery-focus-image img').getAttribute('src')).toContain('second.png');
    expect(screen.el.querySelector('.gallery-position').textContent).toBe('2 / 2');
    expect(screen.el.querySelector('.gallery-nav-next').disabled).toBe(true);
  });

  it('exposes a gallery action from default and structured title buttons', () => {
    const screen = new TitleScreen(document.getElementById('game'), 'Story');
    screen.onGallery = vi.fn();
    screen.show(false, true);
    screen.el.querySelector('#title-gallery').click();
    expect(screen.onGallery).toHaveBeenCalledTimes(1);

    screen.setLayout({
      elements: [{ type: 'button', text: 'Gallery', action: 'gallery' }],
    });
    screen.el.querySelector('.title-custom-button').click();
    expect(screen.onGallery).toHaveBeenCalledTimes(2);
  });

  it('exposes manual opening video replay from structured title buttons', () => {
    const screen = new TitleScreen(document.getElementById('game'), 'Story');
    screen.onPlayOpeningVideo = vi.fn();
    screen.setLayout({
      elements: [{ type: 'button', text: 'OP', action: 'play-opening-video' }],
    });
    screen.show(false, false);

    screen.el.querySelector('.title-custom-button').click();

    expect(screen.onPlayOpeningVideo).toHaveBeenCalledTimes(1);
  });

  it('replays only unlocked manual ending videos from the runtime gallery', () => {
    const screen = new GalleryScreen(document.getElementById('game'));
    screen.onEndingVideoReplay = vi.fn();
    screen.show({}, {}, {
      endings: {
        good_end: {
          title: 'Good End',
          thumbnail: 'ui/endings/good.png',
          endingVideo: { videoId: 'ed_good', play: 'manual' },
        },
        normal_end: {
          title: 'Normal End',
          endingVideo: { videoId: 'ed_normal', play: 'after-unlock' },
        },
        locked_end: {
          title: 'Locked End',
          endingVideo: { videoId: 'ed_locked', play: 'manual' },
        },
        visible_unlocked_later: {
          title: 'Visible But Not Unlocked',
          hiddenUntilUnlocked: false,
          endingVideo: { videoId: 'ed_visible', play: 'manual' },
        },
      },
      endingUnlocks: {
        good_end: { count: 1 },
        normal_end: { count: 1 },
      },
    });

    const endingCards = screen.el.querySelectorAll('.gallery-ending-card');
    expect(endingCards).toHaveLength(4);
    expect(endingCards[0].classList.contains('unlocked')).toBe(true);
    const lockedCard = [...endingCards].find((card) => card.textContent.includes('LOCKED'));
    expect(lockedCard.classList.contains('locked')).toBe(true);

    endingCards[0].click();
    screen.el.querySelector('.gallery-ending-video-replay').click();
    expect(screen.onEndingVideoReplay).toHaveBeenCalledWith('good_end');

    const normalCard = [...endingCards].find((card) => card.textContent.includes('Normal End'));
    normalCard.click();
    expect(screen.el.querySelector('.gallery-ending-video-replay')).toBeNull();

    const visibleButNotUnlocked = [...endingCards].find((card) => card.textContent.includes('Visible But Not Unlocked'));
    visibleButNotUnlocked.click();
    expect(screen.el.querySelector('.gallery-ending-video-replay')).toBeNull();
  });

  it('does not let an earlier hide transition hide a newly shown title screen', () => {
    vi.useFakeTimers();
    try {
      const screen = new TitleScreen(document.getElementById('game'), 'Story');
      screen.show();
      screen.hide();
      screen.show();
      vi.advanceTimersByTime(800);
      expect(screen.el.classList.contains('hidden')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
