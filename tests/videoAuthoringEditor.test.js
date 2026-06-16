import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

function readSource(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

describe('video authoring editor wiring', () => {
  it('adds videos to the resource library and writes assets.videos through the script store', () => {
    const resourceLibrary = readSource('src/editor/views/ResourceLibrary.vue');
    const videoLibrary = readSource('src/editor/components/resource-library/VideoLibrary.vue');
    const scriptStore = readSource('src/editor/stores/script.js');
    const validateAsset = readSource('electron/validateAsset.js');
    const electronMain = readSource('electron/main.js');

    expect(resourceLibrary).toContain("{ id: 'videos'");
    expect(resourceLibrary).toContain("'.mp4,.webm,.png,.jpg,.jpeg,.webp,video/mp4,video/webm,image/png,image/jpeg,image/webp'");
    expect(resourceLibrary).toContain('VideoLibrary');
    expect(videoLibrary).toContain('videoFileList');
    expect(videoLibrary).toContain('posterFileExtensions');
    expect(videoLibrary).toContain('script.createVideoDraft');
    expect(videoLibrary).toContain('script.updateVideoFields');
    expect(videoLibrary).toContain('script.renameVideo');
    expect(videoLibrary).toContain('script.deleteVideo');
    expect(scriptStore).toContain('normalizeVideoRegistry');
    expect(scriptStore).toContain('ensureVideoRegistryState');
    expect(validateAsset).toContain("extensions: ['.mp4', '.webm', '.png', '.jpg', '.jpeg', '.webp']");
    expect(electronMain).toContain("extensions: ['mp4', 'webm', 'png', 'jpg', 'jpeg', 'webp']");
  });

  it('exposes canonical OP, ED, and video page fields through shared video reference controls', () => {
    const titleDesigner = readSource('src/editor/views/TitleDesigner.vue');
    const endingInspector = readSource('src/editor/components/story-systems/EndingInspector.vue');
    const pageInspector = readSource('src/editor/components/page-editor/PageInspector.vue');
    const videoFields = readSource('src/editor/components/resource-library/VideoReferenceFields.vue');
    const assetPicker = readSource('src/editor/components/resource-library/AssetPickerModal.vue');

    expect(titleDesigner).toContain('layout.openingVideo');
    expect(titleDesigner).toContain('setOpeningVideo');
    expect(titleDesigner).toContain('openingPlayModes');
    expect(endingInspector).toContain('endingEntry.endingVideo');
    expect(endingInspector).toContain('setEndingVideo');
    expect(endingInspector).toContain('endingPlayModes');
    expect(pageInspector).toContain('<option value="video">视频播放</option>');
    expect(pageInspector).toContain('setVideoReference');
    expect(pageInspector).toContain('setVideoAutoAdvance');
    expect(pageInspector).toContain('setVideoTarget');
    expect(pageInspector).toContain('setVideoLoop');

    for (const field of ['videoId', 'file', 'poster', 'skippable', 'controls', 'volume', 'audioMode', 'fit', 'play']) {
      expect(videoFields).toContain(field);
    }
    expect(videoFields).toContain(':allowed-extensions="pickerField === \'poster\' ? posterFileExtensions : videoFileExtensions"');
    expect(assetPicker).toContain('allowedExtensions');
    expect(assetPicker).toContain('isImageFile');
  });

  it('keeps title layout saves canonical and prevents theme application from dropping openingVideo', () => {
    const titleDesigner = readSource('src/editor/views/TitleDesigner.vue');
    const scriptStore = readSource('src/editor/stores/script.js');

    expect(titleDesigner).toContain('openingVideo: layout.openingVideo');
    expect(scriptStore).toContain('openingVideo: currentTitleScreen.openingVideo');
    expect(titleDesigner).not.toContain('FileReader');
    expect(titleDesigner).not.toContain('readAsDataURL');
  });
});
