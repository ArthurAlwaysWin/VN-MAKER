import { ref, computed } from 'vue';

/**
 * Composable that computes the visual "scene state" at a given command index
 * by replaying commands 0..index. This powers the canvas preview.
 */
export function useCanvasState(selectedScene, selectedCmdIndex) {
  // Replay commands 0..selectedCmdIndex to compute visual state
  const sceneState = computed(() => {
    const bg = { image: '' };
    const chars = new Map();
    let dlg = null;
    let cho = null;

    if (!selectedScene.value) return { bg, chars, dlg, cho };

    const cmds = selectedScene.value.commands || [];
    const end = selectedCmdIndex.value;

    for (let i = 0; i <= end && i < cmds.length; i++) {
      const cmd = cmds[i];
      switch (cmd.type) {
        case 'set_background':
          bg.image = cmd.image || '';
          break;
        case 'show_character':
          chars.set(cmd.id, {
            id: cmd.id,
            expression: cmd.expression || 'normal',
            position: cmd.position || 'center',
            x: cmd.x,
            y: cmd.y,
            scale: cmd.scale,
          });
          break;
        case 'hide_character':
          chars.delete(cmd.id);
          break;
        case 'set_expression':
          if (chars.has(cmd.id)) {
            const c = { ...chars.get(cmd.id), expression: cmd.expression };
            chars.set(cmd.id, c);
          }
          break;
        case 'dialogue':
          dlg = {
            speaker: cmd.speaker || '',
            text: cmd.text || '',
            style: cmd.style ? { ...cmd.style } : null,
          };
          cho = null;
          break;
        case 'choice':
          cho = {
            prompt: cmd.prompt || '',
            options: (cmd.options || []).map(o => ({ ...o })),
            layout: cmd.layout || 'default',
            style: cmd.style ? { ...cmd.style } : null,
          };
          dlg = null;
          break;
      }
    }

    return { bg, chars, dlg, cho };
  });

  // Update a command's position fields when the user drags an element on canvas
  function updateElementPosition(scene, cmdIndex, elementType, updates) {
    if (!scene || cmdIndex < 0) return;
    const cmd = scene.commands[cmdIndex];
    if (!cmd) return;

    if (elementType === 'character' && cmd.type === 'show_character') {
      if (updates.x !== undefined) cmd.x = Math.round(updates.x);
      if (updates.y !== undefined) cmd.y = Math.round(updates.y);
      if (updates.scale !== undefined) cmd.scale = updates.scale;
      cmd.position = 'custom';
    } else if (elementType === 'dialogue' && cmd.type === 'dialogue') {
      if (!cmd.style) cmd.style = {};
      if (updates.x !== undefined) cmd.style.x = Math.round(updates.x);
      if (updates.y !== undefined) cmd.style.y = Math.round(updates.y);
      if (updates.width !== undefined) cmd.style.width = Math.round(updates.width);
      if (updates.height !== undefined) cmd.style.height = Math.round(updates.height);
    } else if (elementType === 'choice' && cmd.type === 'choice') {
      if (!cmd.style) cmd.style = {};
      cmd.layout = 'custom';
      if (updates.x !== undefined) cmd.style.x = Math.round(updates.x);
      if (updates.y !== undefined) cmd.style.y = Math.round(updates.y);
    }
  }

  // Find the command index that produced a given element type
  function findSourceCommand(scene, fromIndex, type, elementId) {
    if (!scene) return -1;
    const cmds = scene.commands || [];
    for (let i = fromIndex; i >= 0; i--) {
      const cmd = cmds[i];
      if (!cmd) continue;
      if (type === 'character' && cmd.type === 'show_character' && cmd.id === elementId) return i;
      if (type === 'dialogue' && cmd.type === 'dialogue') return i;
      if (type === 'choice' && cmd.type === 'choice') return i;
    }
    return -1;
  }

  return {
    sceneState,
    updateElementPosition,
    findSourceCommand,
  };
}
