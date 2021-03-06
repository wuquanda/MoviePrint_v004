import pathR from 'path';
import fsR from 'fs';
import log from 'electron-log';
import sanitize from 'sanitize-filename';
import * as faceapi from 'face-api.js';

import { VideoCaptureProperties } from './openCVProperties';
import sheetNames from '../img/listOfNames.json';
import { SORT_METHOD, SCENE_DETECTION_MIN_SCENE_LENGTH, SHEET_VIEW, THUMB_SELECTION } from './constants';

const randomColor = require('randomcolor');
const { app } = require('electron').remote;

export const doesFileFolderExist = fileName => {
  return fsR.existsSync(fileName);
};

export const getFileStatsObject = filename => {
  if (doesFileFolderExist(filename) === false) {
    return undefined;
  }
  const stats = fsR.statSync(filename);
  const { mtime, size } = stats;
  return {
    size,
    lastModified: Date.parse(mtime),
  };
};

export const ensureDirectoryExistence = (filePath, isDirectory = true) => {
  let dirname;
  if (isDirectory) {
    dirname = filePath;
  } else {
    dirname = pathR.dirname(filePath);
  }
  // log.debug(dirname);
  if (doesFileFolderExist(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname, false);
  fsR.mkdirSync(dirname);
};

// prevent typeerrors when accessing nested props of a none-existing object
// usage getObjectProperty(() => objectA.propertyB)
export const getObjectProperty = fn => {
  let value;
  try {
    value = fn();
    return value;
  } catch (e) {
    value = undefined;
    return value;
  }
};

export const mapRange = (value, low1, high1, low2, high2, returnInt = true) => {
  // special case, prevent division by 0
  if (high1 - low1 === 0) {
    return 0;
  }
  // * 1.0 added to force float division
  let newValue = low2 + (high2 - low2) * (((value - low1) * 1.0) / (high1 - low1));
  newValue = Math.round(newValue * 1000 + Number.EPSILON) / 1000; // rounds the number with 3 decimals
  let limitedNewValue = Math.min(Math.max(newValue, low2), high2);
  if (returnInt) {
    limitedNewValue = Math.round(limitedNewValue);
  }
  return limitedNewValue;
};

export const limitRange = (value, lowerLimit, upperLimit) =>
  // value || 0 makes sure that NaN s are turned into a number to work with
  Math.min(Math.max(value || 0, lowerLimit || 0), upperLimit || 0);

export const truncate = (n, len) => {
  const ext = n.substring(n.lastIndexOf('.') + 1, n.length).toLowerCase();
  let filename = n.substring(0, n.lastIndexOf('.'));
  if (filename.length <= len) {
    return n;
  }
  filename = filename.substr(0, len) + (n.length > len ? '...' : '');
  return `${filename}.${ext}`;
};

export const truncatePath = (n, len) => {
  // check if length of string is actually longer than truncate length
  // if not return the original string without truncation
  // value of 3 compensates for ... (the 3 dots)
  if (n.length - 3 > len) {
    const front = n.slice(0, len / 2 - 1); // compensate for dots
    const back = n.slice(-len / 2 - 2); // compensate for dots
    return `${front}...${back}`;
  }
  return n;
};

export const pad = (num, size) => {
  if (size !== undefined) {
    let s = num !== undefined ? num.toString() : '';
    while (s.length < size) s = `${num !== undefined ? '0' : '–'}${s}`;
    return s;
  }
  return undefined;
};

export const secondsToFrameCount = (seconds = 0, fps = 25) => {
  const frames = Math.round(seconds * fps * 1.0);
  return frames;
};

export const frameCountToSeconds = (frames, fps = 25) => {
  const seconds = frames !== undefined ? (frames * 1.0) / fps : 0;
  return seconds;
};

export const frameCountToMinutes = (frames, fps = 25) => {
  const seconds = frames !== undefined ? (frames * 1.0) / (fps * 60) : 0;
  return seconds;
};

export const frameCountToTimeCode = (frames, fps = 25) => {
  // fps = (fps !== undefined ? fps : 30);
  if (frames !== undefined) {
    const paddedValue = input => (input < 10 ? `0${input}` : input);
    const seconds = frames !== undefined ? frames / fps : 0;
    return [
      paddedValue(Math.floor(seconds / 3600)),
      paddedValue(Math.floor((seconds % 3600) / 60)),
      paddedValue(Math.floor(seconds % 60)),
      paddedValue(Math.floor(frames % fps)),
    ].join(':');
  }
  return '––:––:––:––';
};

export const secondsToTimeCode = (seconds = 0, fps = 25) => {
  const pad = input => (input < 10 ? `0${input}` : input);

  return [
    pad(Math.floor(seconds / 3600)),
    pad(Math.floor((seconds % 3600) / 60)),
    pad(Math.floor(seconds % 60)),
    pad(Math.floor((seconds * fps) % fps)),
    // pad(Math.floor((seconds - Math.floor(seconds)) * 1000), 3, '0')
  ].join(':');
};

export const formatBytes = (bytes, decimals = 1) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals || 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

export const getMimeType = outputFormat => {
  switch (outputFormat) {
    case 'png':
      return 'image/png';
    case 'jpg':
      return 'image/jpeg';
    default:
      return 'image/png';
  }
};

export const getMoviePrintColor = count => {
  // log.debug(`creating new newColorArray[${count}]`);
  const newColorArray = randomColor({
    count,
    hue: '#FF5006',
  });
  return newColorArray;
};

export const typeInTextarea = (el, textToAdd) => {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value;
  const before = text.substring(0, start);
  const after = text.substring(end, text.length);
  const newText = (el.value = before + textToAdd + after);
  el.selectionStart = el.selectionEnd = start + textToAdd.length;
  el.focus();
  return newText;
};

const fillTemplate = function(templateString, templateVars) {
  return new Function(`return \`${templateString}\`;`).call(templateVars);
};

export const getCustomFileName = (fileName, sheetName, frameNumber, fileNameTemplate) => {
  const paddedFrameNumber = frameNumber === undefined ? '' : pad(frameNumber, 6);
  const movieName = pathR.parse(fileName).name;
  const movieExtension = pathR.parse(fileName).ext.substr(1); // remove dot from extension

  try {
    // prepare fileNameTemplate
    const mapObj = {
      '[MN]': '${this.movieName}',
      '[ME]': '${this.movieExtension}',
      '[MPN]': '${this.moviePrintName}',
      '[FN]': '${this.paddedFrameNumber}',
    };
    const preparedFileNameTemplate = fileNameTemplate.replace(/\[MN\]|\[ME\]|\[MPN\]|\[FN\]/gi, function(matched) {
      return mapObj[matched];
    });

    // fill fileNameTemplate with parameters
    const templateVars = {
      movieName,
      movieExtension,
      moviePrintName: sheetName,
      paddedFrameNumber,
    };
    const customFileName = fillTemplate(preparedFileNameTemplate, templateVars);
    const validFilename = customFileName.replace(/[/\\?%*:|"<>]/g, '-');
    return validFilename;
  } catch (e) {
    log.error(e);
    return undefined;
  }
};

export const getFilePathObject = (
  fileName,
  sheetName,
  frameNumber,
  fileNameTemplate,
  outputFormat,
  // exportPath = '',
  exportPath = app.getPath('desktop'),
  overwrite = false,
) => {
  const validFilename = getCustomFileName(fileName, sheetName, frameNumber, fileNameTemplate);

  if (validFilename !== undefined) {
    let newFilePathAndName = pathR.join(exportPath, `${validFilename}.${outputFormat}`);

    if (!overwrite) {
      if (doesFileFolderExist(newFilePathAndName)) {
        for (let i = 1; i < 1000; i += 1) {
          newFilePathAndName = pathR.join(exportPath, `${validFilename} edit ${i}.${outputFormat}`);
          if (doesFileFolderExist(newFilePathAndName) === false) {
            break;
          }
        }
      }
    }
    return pathR.parse(newFilePathAndName);
  }
  // validFilename === undefined, return default name
  const standardFilePathAndName = pathR.join(exportPath, `MoviePrint.${outputFormat}`);
  return pathR.parse(standardFilePathAndName);
};

export const getThumbInfoValue = (type, frames, framesPerSecond) => {
  switch (type) {
    case 'frames':
      return pad(frames, 4);
    case 'timecode':
      return frameCountToTimeCode(frames, framesPerSecond);
    case 'hideInfo':
      return undefined;
    default:
      return undefined;
  }
};

export const getLowestFrame = thumbs => {
  if (thumbs && thumbs.length > 0) {
    return thumbs.reduce((min, p) => (p.frameNumber < min ? p.frameNumber : min), thumbs[0].frameNumber);
  }
  return undefined;
};

export const getHighestFrame = thumbs => {
  if (thumbs && thumbs.length > 0) {
    return thumbs.reduce((max, p) => (p.frameNumber > max ? p.frameNumber : max), thumbs[0].frameNumber);
  }
  return undefined;
};

export const getAllFrameNumbers = thumbs => {
  if (thumbs && thumbs.length > 0) {
    return thumbs.map(thumb => thumb.frameNumber);
  }
  return [];
};

export const getLowestFrameFromScenes = scenes => {
  if (scenes && scenes.length > 0) {
    return scenes.reduce((min, p) => (p.start < min ? p.start : min), scenes[0].start);
  }
  return undefined;
};

export const getHighestFrameFromScenes = scenes => {
  if (scenes && scenes.length > 0) {
    return scenes.reduce(
      (max, p) => (p.start + p.length - 1 > max ? p.start + p.length - 1 : max),
      scenes[0].start + scenes[0].length - 1,
    );
  }
  return undefined;
};

export const getPreviousScenes = (scenes, sceneId) => {
  if (scenes) {
    if (sceneId) {
      // get index of array as scene does not have an own index
      const currentIndex = scenes.findIndex(scene => scene.sceneId === sceneId);
      return scenes.filter(
        (scene, index) => (scene.hidden === false || scene.hidden === undefined) && index < currentIndex,
      );
    }
    return scenes; // return last item if no sceneId provided
  }
  return undefined; // return undefined if no scenes provided
};

export const getNextScenes = (scenes, sceneId) => {
  if (scenes) {
    if (sceneId) {
      // get index of array as scene does not have an own index
      const currentIndex = scenes.findIndex(scene => scene.sceneId === sceneId);
      return scenes.filter(
        (scene, index) => (scene.hidden === false || scene.hidden === undefined) && index > currentIndex,
      );
    }
    return scenes; // return last item if no sceneId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getInvertedThumbs = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      // get index of thumb
      return thumbs.filter(
        thumb => (thumb.hidden === false || thumb.hidden === undefined) && thumb.thumbId !== thumbId,
      );
    }
    return thumbs; // return last item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getPreviousThumbs = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      // get index of thumb
      const currentIndex = thumbs.find(thumb => thumb.thumbId === thumbId).index;
      return thumbs.filter(
        thumb => (thumb.hidden === false || thumb.hidden === undefined) && thumb.index < currentIndex,
      );
    }
    return thumbs; // return last item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getNextThumbs = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      // get index of thumb
      const currentIndex = thumbs.find(thumb => thumb.thumbId === thumbId).index;
      return thumbs.filter(
        thumb => (thumb.hidden === false || thumb.hidden === undefined) && thumb.index > currentIndex,
      );
    }
    return thumbs; // return last item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getPreviousThumb = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      // get index of thumb
      const foundThumb = thumbs.find(thumb => thumb.thumbId === thumbId);
      if (foundThumb === undefined) {
        return thumbs[thumbs.length - 1]; // return last item if no thumb found
      }
      const currentIndex = foundThumb.index;
      const newIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : thumbs.length - 1;
      // log.debug(thumbs[newIndex]);
      return thumbs[newIndex];
    }
    return thumbs[thumbs.length - 1]; // return last item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getNextThumb = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      // get index of thumb
      const foundThumb = thumbs.find(thumb => thumb.thumbId === thumbId);
      if (foundThumb === undefined) {
        return thumbs[0]; // return first item if no thumb found
      }
      const currentIndex = foundThumb.index;
      const newIndex = currentIndex + 1 < thumbs.length ? currentIndex + 1 : 0;
      // log.debug(thumbs[newIndex]);
      return thumbs[newIndex];
    }
    return thumbs[0]; // return first item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getVisibleThumbs = (thumbs, filter) => {
  if (thumbs === undefined) {
    return thumbs;
  }
  switch (filter) {
    case THUMB_SELECTION.ALL_THUMBS:
      return thumbs;
    case THUMB_SELECTION.HIDDEN_THUMBS:
      return thumbs.filter(t => t.hidden);
    case THUMB_SELECTION.VISIBLE_THUMBS:
      return thumbs.filter(t => !t.hidden);
    default:
      return thumbs;
  }
};

export const getAspectRatio = file => {
  if (file === undefined || file.width === undefined || file.height === undefined) {
    return (16 * 1.0) / 9; // default 16:9
  }
  return (file.width * 1.0) / file.height;
};

export const getRandomSheetName = () => {
  // return random name from sheetNames array
  const randomNameObject = sheetNames[Math.floor(Math.random() * sheetNames.length)];
  return randomNameObject.fullName;
};

export const getNewSheetName = (sheetCount = 0, defaultName = 'MoviePrint-') => {
  // return random name from sheetNames array
  const sheetName = `${defaultName}${sheetCount + 1}`;
  return sheetName;
};

export const getSheetId = (sheetsByFileId, fileId) => {
  if (sheetsByFileId[fileId] === undefined) {
    // there is no file yet, so return undefined
    return undefined;
  }
  const sheetIdArray = Object.getOwnPropertyNames(sheetsByFileId[fileId]);
  if (sheetIdArray.length === 0) {
    // there are no sheetIds yet, so return undefined
    return undefined;
  }
  // return first sheetId in array
  return sheetIdArray[0];
};

export const getParentSheetId = (sheetsByFileId, fileId, sheetId) => {
  if (
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].parentSheetId === undefined
  ) {
    return undefined;
  }
  return sheetsByFileId[fileId][sheetId].parentSheetId;
};

export const doesSheetExist = (sheetsByFileId, fileId, sheetId) => {
  if (
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined
  ) {
    return false;
  }
  return true;
};

export const getFramenumbers = (sheet, visibilityFilter) => {
  if (sheet.thumbsArray === undefined) {
    return undefined;
  }
  const { thumbsArray } = sheet;
  if (visibilityFilter === THUMB_SELECTION.VISIBLE_THUMBS) {
    const frameNumberArray = thumbsArray.filter(thumb => thumb.hidden === false).map(thumb => thumb.frameNumber);
    return frameNumberArray;
  }
  return thumbsArray.map(thumb => thumb.frameNumber);
};

export const getFramenumbersOfSheet = (sheetsByFileId, fileId, sheetId, visibilitySettings) => {
  if (
    sheetsByFileId[fileId] === undefined ||
    fileId === undefined ||
    sheetId === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].thumbsArray === undefined
  ) {
    return undefined;
  }
  const { thumbsArray } = sheetsByFileId[fileId][sheetId];
  if (visibilitySettings.visibilityFilter === THUMB_SELECTION.VISIBLE_THUMBS) {
    const frameNumberArray = thumbsArray.filter(thumb => thumb.hidden === false).map(thumb => thumb.frameNumber);
    return frameNumberArray;
  }
  return thumbsArray.map(thumb => thumb.frameNumber);
};

export const getEDLscenes = (sheetsByFileId, fileId, sheetId, visibilitySettings, fps) => {
  if (
    sheetsByFileId[fileId] === undefined ||
    fileId === undefined ||
    sheetId === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].sceneArray === undefined
  ) {
    return undefined;
  }
  const { sceneArray } = sheetsByFileId[fileId][sheetId];
  if (visibilitySettings.visibilityFilter === THUMB_SELECTION.VISIBLE_THUMBS) {
    const frameNumberArray = sceneArray
      .filter(scene => scene.hidden === false)
      .map(
        (scene, index) =>
          `${pad(index + 1, 3)}  ${pad(index % 2, 3)}       V     C        ${frameCountToTimeCode(
            scene.start,
            fps,
          )} ${frameCountToTimeCode(scene.start + scene.length, fps)} ${frameCountToTimeCode(
            scene.start,
            fps,
          )} ${frameCountToTimeCode(scene.start + scene.length, fps)}`,
      );
    return frameNumberArray;
  }
  return sceneArray.map(
    (scene, index) =>
      `${pad(index + 1, 3)}  ${pad(index % 2, 3)}       V     C        ${frameCountToTimeCode(
        scene.start,
        fps,
      )} ${frameCountToTimeCode(scene.start + scene.length, fps)} ${frameCountToTimeCode(
        scene.start,
        fps,
      )} ${frameCountToTimeCode(scene.start + scene.length, fps)}`,
  );
};

export const getSheetCount = (files, fileId) => {
  const file = getFile(files, fileId);
  // console.log(file);
  if (file === undefined) {
    // there is no file yet, so return undefined
    return 0;
  }
  return file.sheetCounter;
};

export const getFile = (files, fileId) => {
  const file = files.find(file2 => file2.id === fileId);
  // console.log(file);
  if (file === undefined) {
    // there is no file yet, so return undefined
    return undefined;
  }
  return file;
};

export const getFileName = (files, fileId) => {
  const file = getFile(files, fileId);
  // console.log(file);
  if (file === undefined) {
    // there is no file yet, so return undefined
    return 0;
  }
  return file.name;
};

export const getFilePath = (files, fileId) => {
  const file = getFile(files, fileId);
  // console.log(file);
  if (file === undefined) {
    // there is no file yet, so return undefined
    return 0;
  }
  return file.path;
};

export const getFrameCount = (files, fileId) => {
  const file = getFile(files, fileId);
  // console.log(file);
  if (file === undefined) {
    // there is no file yet, so return undefined
    return 0;
  }
  return file.frameCount;
};

export const getFileTransformObject = (files, fileId) => {
  const file = getFile(files, fileId);
  // console.log(file);
  if (file === undefined) {
    // there is no file yet, so return undefined
    return 0;
  }
  return file.transformObject;
};

export const getSheetIdArray = (sheetsByFileId, fileId) => {
  if (sheetsByFileId[fileId] === undefined) {
    // there is no file yet, so return undefined
    return undefined;
  }
  const sheetIdArray = Object.getOwnPropertyNames(sheetsByFileId[fileId]);
  if (sheetIdArray.length === 0) {
    // there are no sheetIds yet, so return undefined
    return undefined;
  }
  // return first sheetId in array
  return sheetIdArray;
};

export const getSheetName = (sheetsByFileId, fileId, sheetId) => {
  if (
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].name === undefined
  ) {
    return 'MoviePrint';
  }
  return sheetsByFileId[fileId][sheetId].name;
};

export const getSheetFilter = (sheetsByFileId, fileId, sheetId) => {
  if (
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].filter === undefined
  ) {
    return {}; // empty object means no filter
  }
  return sheetsByFileId[fileId][sheetId].filter;
};

export const getSheetView = (sheetsByFileId, fileId, sheetId) => {
  if (
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].sheetView === undefined
  ) {
    return SHEET_VIEW.GRIDVIEW;
  }
  return sheetsByFileId[fileId][sheetId].sheetView;
};

export const getSheetType = (sheetsByFileId, fileId, sheetId, settings) => {
  if (
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].type === undefined
  ) {
    return settings.defaultSheetType;
  }
  return sheetsByFileId[fileId][sheetId].type;
};

export const getColumnCount = (sheetsByFileId, fileId, sheetId, settings) => {
  if (
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].columnCount === undefined
  ) {
    return settings.defaultColumnCount;
  }
  return sheetsByFileId[fileId][sheetId].columnCount;
};

export const getSecondsPerRow = (sheetsByFileId, fileId, sheetId, settings) => {
  if (
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].secondsPerRow === undefined
  ) {
    return settings.defaultTimelineViewSecondsPerRow;
  }
  return sheetsByFileId[fileId][sheetId].secondsPerRow;
};

export const getThumbsCount = (sheetsByFileId, fileId, sheetId, settings, visibilityFilter, noDefault = false) => {
  if (
    fileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetId === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].thumbsArray === undefined
  ) {
    return noDefault ? 0 : settings.defaultThumbCount;
  }
  if (visibilityFilter === THUMB_SELECTION.VISIBLE_THUMBS) {
    return sheetsByFileId[fileId][sheetId].thumbsArray.filter(thumb => thumb.hidden === false).length;
  }
  return sheetsByFileId[fileId][sheetId].thumbsArray.length;
};

export const getShotNumber = (sceneId, sheetsByFileId, fileId, sheetId) => {
  if (
    fileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetId === undefined ||
    sceneId === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].sceneArray === undefined
  ) {
    return undefined;
  }
  const shotNumber = sheetsByFileId[fileId][sheetId].sceneArray.findIndex(scene => scene.sceneId === sceneId) + 1; // index is zero based
  return shotNumber;
};

export const setPosition = (vid, frameNumberToCapture, useRatio) => {
  if (vid !== undefined) {
    if (useRatio) {
      const positionRatio = (frameNumberToCapture * 1.0) / (vid.get(VideoCaptureProperties.CAP_PROP_FRAME_COUNT) - 1);
      // log.debug(`setPosition using positionRatio: ${positionRatio}`);
      vid.set(VideoCaptureProperties.CAP_PROP_POS_AVI_RATIO, positionRatio);
    } else {
      // log.debug(`setPosition using frame position: ${frameNumberToCapture}`);
      vid.set(VideoCaptureProperties.CAP_PROP_POS_FRAMES, frameNumberToCapture);
    }
  }
};

export const renderImage = (img, canvas, cv) => {
  const matRGBA = img.channels === 1 ? img.cvtColor(cv.COLOR_GRAY2RGBA) : img.cvtColor(cv.COLOR_BGR2RGBA);

  canvas.height = img.rows;
  canvas.width = img.cols;
  const imgData = new ImageData(new Uint8ClampedArray(matRGBA.getData()), img.cols, img.rows);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imgData, 0, 0);
};

export const getScrubFrameNumber = (
  mouseX,
  keyObject,
  scaleValueObject,
  frameCount,
  scrubThumb,
  scrubThumbLeft,
  scrubThumbRight,
) => {
  let scrubFrameNumber;

  // when scrubbing all the way to the left/right sideMargin gives space
  // when selecting the first/last frame close to the window border
  const sideMargin = 10;

  // depending on if scrubbing over ScrubMovie change mapping range
  // scrubbing over ScrubMovie scrubbs over scene, with ctrl pressed scrubbing left or right of it scrubs over whole movie
  // depending on if add before (shift) or after (alt) changing the mapping range
  const tempLeftFrameNumber = keyObject.altKey ? scrubThumb.frameNumber : scrubThumbLeft.frameNumber;
  const tempRightFrameNumber = keyObject.shiftKey ? scrubThumb.frameNumber : scrubThumbRight.frameNumber;
  const leftOfScrubMovie = (scaleValueObject.scrubInnerContainerWidth - scaleValueObject.scrubMovieWidth) / 2;
  const rightOfScrubMovie = leftOfScrubMovie + scaleValueObject.scrubMovieWidth;

  // check if scrubbed thumb is first/last thumb
  // in this case take range movie start/end same as when pressing ctrl
  const isFirstThumb = scrubThumb.frameNumber === scrubThumbLeft.frameNumber;
  const isLastThumb = scrubThumb.frameNumber === scrubThumbRight.frameNumber;

  if (mouseX < leftOfScrubMovie) {
    if (keyObject.ctrlKey || isFirstThumb) {
      scrubFrameNumber = mapRange(mouseX, 0 + sideMargin, leftOfScrubMovie, 0, tempLeftFrameNumber);
    } else {
      scrubFrameNumber = tempLeftFrameNumber;
    }
  } else if (mouseX > rightOfScrubMovie) {
    if (keyObject.ctrlKey || isLastThumb) {
      scrubFrameNumber = mapRange(
        mouseX,
        rightOfScrubMovie,
        scaleValueObject.containerWidth - sideMargin,
        tempRightFrameNumber,
        frameCount - 1,
      );
    } else {
      scrubFrameNumber = tempRightFrameNumber;
    }
  } else {
    scrubFrameNumber = mapRange(mouseX, leftOfScrubMovie, rightOfScrubMovie, tempLeftFrameNumber, tempRightFrameNumber);
  }
  return scrubFrameNumber;
};

export const getSceneScrubFrameNumber = (mouseX, scaleValueObject, scrubThumb, scrubScene) => {
  let scrubFrameNumber;

  const leftOfScrubMovie = (scaleValueObject.scrubInnerContainerWidth - scaleValueObject.scrubMovieWidth) / 2;
  const rightOfScrubMovie = leftOfScrubMovie + scaleValueObject.scrubMovieWidth;
  const tempLeftFrameNumber = scrubScene.start;
  const tempRightFrameNumber = scrubScene.start + scrubScene.length - 1;
  if (mouseX < leftOfScrubMovie) {
    scrubFrameNumber = tempLeftFrameNumber;
  } else if (mouseX > rightOfScrubMovie) {
    scrubFrameNumber = tempRightFrameNumber;
  } else {
    scrubFrameNumber = mapRange(mouseX, leftOfScrubMovie, rightOfScrubMovie, tempLeftFrameNumber, tempRightFrameNumber);
  }
  return scrubFrameNumber;
};

export const deleteProperty = ({ [key]: _, ...newObj }, key) => newObj;

export const isEquivalent = (a, b) => {
  // Create arrays of property names
  const aProps = Object.getOwnPropertyNames(a);
  const bProps = Object.getOwnPropertyNames(b);

  // If number of properties is different,
  // objects are not equivalent
  if (aProps.length !== bProps.length) {
    return false;
  }

  for (let i = 0; i < aProps.length; i += 1) {
    const propName = aProps[i];

    // If values of same property are not equal,
    // objects are not equivalent
    if (a[propName] !== b[propName]) {
      return false;
    }
  }

  // If we made it this far, objects
  // are considered equivalent
  return true;
};

export const fourccToString = fourcc =>
  `${String.fromCharCode(fourcc & 0xff)}${String.fromCharCode((fourcc & 0xff00) >> 8)}${String.fromCharCode(
    (fourcc & 0xff0000) >> 16,
  )}${String.fromCharCode((fourcc & 0xff000000) >> 24)}`;

export const roundNumber = (number, decimals = 2) =>
  Math.round(number * 10 ** decimals + Number.EPSILON) / 10 ** decimals; // rounds the number with 3 decimals

export const getTextWidth = (text, font) => {
  // re-use canvas object for better performance
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
};

export const limitFrameNumberWithinMovieRange = (file, frameNumber) => {
  const limitedFrameNumber = Math.min(file.frameCount - 1, Math.max(0, frameNumber)); // limit it on lower and on upper end
  return limitedFrameNumber;
};

export const arrayToObject = (array, keyField) => {
  if (array === undefined) {
    return {};
  }
  return array.reduce((obj, item) => {
    obj[item[keyField]] = item;
    return obj;
  }, {});
};

export const getScenesInRows = (sceneArray, secondsPerRow) => {
  // get scenes in rows
  if (sceneArray.length === 0) {
    return [];
  }
  const framesPerRow = secondsPerRow * 25;
  // console.log(framesPerRow);
  const sceneLengthsInRowArray = [];
  // sceneLengthsInRowArray.push(sceneArray[0].length);
  const rowArray = [];
  let previousSceneOutPoint = sceneArray[0].start; // get first sceneStart
  // console.log(sceneArray);
  sceneArray.map((scene, index) => {
    // console.log(`${scene.start}, ${scene.length}, ${index}`);
    const sceneOutPoint = previousSceneOutPoint + scene.length;
    sceneLengthsInRowArray.push(scene.length);
    if (sceneLengthsInRowArray.reduce((a, b) => a + b, 0) > framesPerRow) {
      if (sceneLengthsInRowArray.length === 1) {
        // if only 1 scene
        rowArray.push({
          index,
          sceneOutPoint,
          rowItemCount: sceneLengthsInRowArray.length, // get length
          rowLength: sceneLengthsInRowArray.reduce((a, b) => a + b, 0), // get sum of all lengths
          sceneLengthsInRow: sceneLengthsInRowArray.slice(), // pass copy of array
        });
        sceneLengthsInRowArray.length = 0; // clear array
      } else {
        // if more than 1 scene
        rowArray.push({
          index: index - 1,
          sceneOutPoint: previousSceneOutPoint,
          rowItemCount: sceneLengthsInRowArray.slice(0, -1).length, // remove last and get length
          rowLength: sceneLengthsInRowArray.slice(0, -1).reduce((a, b) => a + b, 0), // remove last and get sum of all lengths
          sceneLengthsInRow: sceneLengthsInRowArray.slice(0, -1), // remove last and pass copy of array
        });
        sceneLengthsInRowArray.splice(0, sceneLengthsInRowArray.length - 1); // only keep last
      }
    }
    if (sceneArray.length === index + 1) {
      // last scene
      rowArray.push({
        index,
        sceneOutPoint,
        rowItemCount: sceneLengthsInRowArray.length,
        rowLength: sceneLengthsInRowArray.reduce((a, b) => a + b, 0), // sum of all lengths
        sceneLengthsInRow: sceneLengthsInRowArray.slice(), // pass copy of array
      });
    }
    previousSceneOutPoint = sceneOutPoint;
    return undefined;
  });
  // console.log(rowArray);
  return rowArray;
};

export const getWidthOfSingleRow = (scenes, thumbMargin, pixelPerFrameRatio, minSceneLength) => {
  if (scenes === undefined) {
    return undefined;
  }
  const sceneLengthArray = scenes.map(scene => Math.max(scene.length, minSceneLength));
  const sumSceneLengths = sceneLengthArray.reduce((a, b) => a + b, 0);
  const widthOfSingleRow = sumSceneLengths * pixelPerFrameRatio + scenes.length * thumbMargin * 2;
  return widthOfSingleRow;
};

// export const getWidthOfLongestRow = (rowArray, thumbMargin, pixelPerFrameRatio, minSceneLengthInFrames) => {
//   // calculate width through getting longest row
//   // console.log(rowArray);
//   // console.log(thumbMargin);
//   // console.log(pixelPerFrameRatio);
//   if (rowArray.length === 0) {
//     return undefined;
//   }
//   const rowLengthArray = [];
//   rowArray.map((row) => {
//     // console.log(row.sceneLengthsInRow);
//     // calculate width
//     let rowWidth = 0;
//     row.sceneLengthsInRow.map((sceneLength) => {
//       // const widthOfScene = Math.max(sceneLength, minSceneLengthInFrames) * pixelPerFrameRatio + thumbMargin * 2;
//       const widthOfScene = Math.max(sceneLength, minSceneLengthInFrames) * pixelPerFrameRatio + thumbMargin * 2 * pixelPerFrameRatio;
//       rowWidth += widthOfScene;
//       // console.log(widthOfScene);
//       return undefined;
//     });
//     rowLengthArray.push(Math.ceil(rowWidth));
//     return undefined;
//   })
//   const maxWidth = Math.max(...rowLengthArray);
//   // console.log(rowLengthArray);
//   // console.log(maxWidth);
//   return maxWidth
// }

export const getPixelPerFrameRatio = (rowArray, thumbMargin, width, minSceneLengthInFrames) => {
  // calculate width through getting longest row
  // console.log(rowArray);
  // console.log(thumbMargin);
  // console.log(width);
  if (rowArray.length === 0) {
    return undefined;
  }
  const pixelPerFrameRatioArray = [];
  rowArray.map(row => {
    const numOfScenesInRow = row.sceneLengthsInRow.length;
    const minScenesArray = row.sceneLengthsInRow.filter(item => item <= minSceneLengthInFrames);
    const numOfMinScenes = minScenesArray.length;
    const lengthOfMinScenes = minScenesArray.reduce((a, b) => a + b, 0);
    const lengthOfAllScenes = row.rowLength;
    const lengthOfOtherScenes = lengthOfAllScenes - lengthOfMinScenes;
    // console.log(numOfScenesInRow);
    // console.log(numOfMinScenes);
    // console.log(lengthOfOtherScenes);
    // console.log(lengthOfAllScenes);
    // calculate pixelPerFrameRatio
    const pixelPerFrameRatio =
      (width - numOfScenesInRow * thumbMargin * 2) / (+numOfMinScenes * minSceneLengthInFrames + lengthOfOtherScenes);
    // console.log(pixelPerFrameRatio);
    pixelPerFrameRatioArray.push(pixelPerFrameRatio);
    return undefined;
  });
  const minPixelPerFrameRatio = Math.min(...pixelPerFrameRatioArray);
  // console.log(pixelPerFrameRatioArray);
  // console.log(minPixelPerFrameRatio);
  return minPixelPerFrameRatio;
};

export const createSceneArray = (sheetsByFileId, fileId, sheetId) => {
  if (
    sheetsByFileId[fileId] !== undefined &&
    sheetsByFileId[fileId][sheetId] !== undefined &&
    sheetsByFileId[fileId][sheetId].thumbsArray !== undefined
  ) {
    const { thumbsArray } = sheetsByFileId[fileId][sheetId];
    if (thumbsArray.length > 0) {
      const visibleThumbsArray = getVisibleThumbs(thumbsArray, THUMB_SELECTION.VISIBLE_THUMBS);
      visibleThumbsArray.sort((t1, t2) => t1.frameNumber - t2.frameNumber);
      // console.log(visibleThumbsArray);
      const sceneArray = [];
      let sceneStart = visibleThumbsArray[0].frameNumber; // first sceneStart value
      let sceneLength = Math.floor((visibleThumbsArray[1].frameNumber - visibleThumbsArray[0].frameNumber) / 2) + 1; // first sceneLength value
      visibleThumbsArray.map((thumb, index, array) => {
        if (index !== 0) {
          // everything except the first thumb
          sceneStart += sceneLength;
          if (index < array.length - 1) {
            // then until second to last
            const nextThumb = array[index + 1];
            sceneLength =
              Math.floor((nextThumb.frameNumber - thumb.frameNumber) / 2) + thumb.frameNumber - sceneStart + 1;
          } else {
            // last thumb
            sceneLength = thumb.frameNumber - sceneStart;
          }
        }
        sceneArray.push({
          sceneId: thumb.thumbId,
          fileId,
          sheetId,
          start: sceneStart,
          length: sceneLength,
          colorArray: [40, 40, 40],
        });
        return undefined;
      });
      // console.log(sceneArray);
      return sceneArray;
    }
    return [];
  }
  return [];
};

export const getSliceWidthArrayForScrub = (vid, sliceArraySize = 19, sliceWidthOutsideMin = 20) => {
  const width = vid.get(VideoCaptureProperties.CAP_PROP_FRAME_WIDTH);
  // const height = vid.get(VideoCaptureProperties.CAP_PROP_FRAME_HEIGHT);
  const sliceWidthInMiddle = width;
  const sliceWidthArray = [];
  const halfArraySize = Math.ceil(sliceArraySize / 2);
  for (let i = 0; i < sliceArraySize; i += 1) {
    const factor = i < halfArraySize ? halfArraySize - (i + 1) : i + 1 - halfArraySize;
    const sliceWidth = Math.floor(sliceWidthInMiddle / 2 ** factor);
    sliceWidthArray.push(Math.max(sliceWidth, sliceWidthOutsideMin));
  }
  return sliceWidthArray;
};

export const getSliceWidthArrayForCut = (canvasWidth, sliceArraySize = 20, sliceGap = 1, cutGap = 8) => {
  const isAsymmetrical = sliceArraySize % 2 === 1;
  const halfArraySize = Math.floor(sliceArraySize / 2);
  const newCanvasWidth = canvasWidth - cutGap - sliceGap * sliceArraySize;
  const sliceWidthInMiddle = Math.floor(newCanvasWidth / (isAsymmetrical ? 3 : 4));
  const sliceWidthArray = [];
  let factor;
  for (let i = 0; i < sliceArraySize; i += 1) {
    if (isAsymmetrical) {
      factor = i < halfArraySize ? halfArraySize - (i + 1) : i + 1 - halfArraySize;
    } else {
      factor = i < halfArraySize ? halfArraySize - (i + 1) : i - halfArraySize;
    }
    const sliceWidth = Math.floor(sliceWidthInMiddle / 2 ** factor);
    sliceWidthArray.push(Math.max(sliceWidth, 1)); // keep minimum of 1px
  }
  return sliceWidthArray;
};

export const getSceneFromFrameNumber = (scenes, frameNumber) => {
  if (scenes === undefined) {
    return undefined;
  }
  const scene = scenes.find(scene1 => scene1.start <= frameNumber && scene1.start + scene1.length > frameNumber);
  if (scene !== undefined || scenes.length < 1) {
    return scene;
  }
  const maxFrameNumberScene = scenes.reduce((prev, current) =>
    prev.start + prev.length > current.start + current.length ? prev : current,
  );
  const minFrameNumberScene = scenes.reduce((prev, current) => (prev.start < current.start ? prev : current));
  const maxFrameNumber = maxFrameNumberScene.start + maxFrameNumberScene.length - 1;
  const minFrameNumber = minFrameNumberScene.start;
  const newFrameNumberToSearch = Math.min(maxFrameNumber, Math.max(minFrameNumber, frameNumber));
  const closestScene = scenes.find(
    scene1 => scene1.start <= newFrameNumberToSearch && scene1.start + scene1.length > newFrameNumberToSearch,
  );
  return closestScene;
};

export const getLeftAndRightThumb = (thumbs, thumbCenterId) => {
  if (thumbs === undefined || thumbCenterId === undefined) {
    return undefined;
  }
  // get thumb left and right of scrubThumb
  const indexOfThumb = thumbs.findIndex(thumb => thumb.thumbId === thumbCenterId);
  const thumbCenter = thumbs[indexOfThumb];
  const tempLeftThumb = thumbs[Math.max(0, indexOfThumb - 1)];
  const tempRightThumb = thumbs[Math.min(thumbs.length - 1, indexOfThumb + 1)];

  // the three thumbs might not be in ascending order, left has to be lower, right has to be higher
  // create an array to compare the three thumbs
  const arrayToCompare = [tempLeftThumb, tempRightThumb, thumbCenter];

  // copy the first array with slice so I can run it a second time (reduce mutates the array)
  const thumbLeft = arrayToCompare
    .slice()
    .reduce((prev, current) => (prev.frameNumber < current.frameNumber ? prev : current));
  const thumbRight = arrayToCompare.reduce((prev, current) =>
    prev.frameNumber > current.frameNumber ? prev : current,
  );
  return {
    thumbCenter,
    thumbLeft,
    thumbRight,
  };
};

export const getAdjacentSceneIndicesFromCut = (scenes, frameNumber) => {
  // return an array of 2 adjacent scenes if the frameNumber is the cut in between
  // else return undefined
  const sceneIndex = scenes.findIndex(scene1 => scene1.start === frameNumber);
  console.log(frameNumber);
  console.log(scenes);
  if (sceneIndex <= 0) {
    return undefined;
  }
  const adjacentSceneIndicesArray = [sceneIndex - 1, sceneIndex];
  console.log(adjacentSceneIndicesArray);
  return adjacentSceneIndicesArray;
};

export const getBucketValueOfPercentage = (percentage, amountOfBuckets) => {
  // take percentage and return bucketed percentage value, like a histogram value or bin
  return (Math.floor((percentage * 100.0) / (100.0 / (amountOfBuckets - 1))) * (100.0 / (amountOfBuckets - 1))) / 100.0;
};

export const getFrameInPercentage = (frameNumber, frameCount) => {
  if (frameCount > 1) {
    return (frameNumber / ((frameCount - 1) * 1.0)) * 100.0;
  }
  return 0;
};

export const calculateSceneListFromDifferenceArray = (fileId, differenceArray, meanColorArray, threshold) => {
  let lastSceneCut = null;
  let differenceValueFromLastSceneCut;
  const sceneList = [];
  differenceArray.map((differenceValue, index) => {
    // initialise first scene cut
    if (lastSceneCut === null) {
      lastSceneCut = index;
    }
    if (differenceValue >= threshold) {
      if (index - lastSceneCut >= SCENE_DETECTION_MIN_SCENE_LENGTH) {
        // check if differenceValue is not within SCENE_DETECTION_MIN_SCENE_LENGTH
        const start = lastSceneCut; // start
        const length = index - start; // length
        const colorArray = meanColorArray[start + Math.floor(length / 2)];
        sceneList.push({
          fileId,
          start,
          length,
          colorArray,
        });
        lastSceneCut = index;
      } else if (differenceValue > differenceValueFromLastSceneCut) {
        // check if there is a more distinct cut within SCENE_DETECTION_MIN_SCENE_LENGTH
        // if so, remove the previous one and use the new one
        // only if sceneList not empty (otherwise pop returns undefined)
        if (sceneList.length !== 0) {
          const lastScene = sceneList.pop();
          const { start } = lastScene; // get start from lastScene
          const length = index - start; // length
          const colorArray = meanColorArray[start + Math.floor(length / 2)];
          sceneList.push({
            fileId,
            start,
            length,
            colorArray,
          });
          lastSceneCut = index;
        } else {
          // if first scene within SCENE_DETECTION_MIN_SCENE_LENGTH
          const start = 0;
          const length = index - start; // length
          const colorArray = meanColorArray[start + Math.floor(length / 2)];
          sceneList.push({
            fileId,
            start,
            length,
            colorArray,
          });
          lastSceneCut = index;
        }
      }
    }
    differenceValueFromLastSceneCut = differenceValue;
    // console.log(`${index} - ${lastSceneCut} = ${index - lastSceneCut} - ${differenceValue >= threshold}`);
    return true;
  });
  // add last scene
  const length = differenceArray.length - lastSceneCut; // meanArray.length should be frameCount
  sceneList.push({
    fileId,
    start: lastSceneCut, // start
    length,
    colorArray: [128, 128, 128],
    // [frameMean.w, frameMean.x, frameMean.y], // color
  });
  // console.log(sceneList);
  return sceneList;
};

// repairs missing frames in frameScanData in place
export const repairFrameScanData = (arrayOfFrameScanData, frameCount) => {
  // frameScanData is not complete
  // create new array and fill in the blanks
  for (let i = 0; i < frameCount; i += 1) {
    if (i !== arrayOfFrameScanData[i].frameNumber) {
      // if frame is missing, take previous data,
      // fix framenumber, insert it and decrease i again
      // so it loops through it again to check

      // if first frame missing fill it with default object
      let correctedDuplicate;
      if (i === 0) {
        correctedDuplicate = {
          frameNumber: 0,
          meanColor: '[0,0,0]',
          differenceValue: 0,
        };
      } else {
        correctedDuplicate = { ...arrayOfFrameScanData[i - 1] };
        correctedDuplicate.frameNumber = i;
      }
      log.info(`repaired frameScanData at: ${i}`);
      arrayOfFrameScanData.splice(i, 0, correctedDuplicate);
      i -= 1;
    }
  }
  // no return is needed as arrayOfFrameScanData gets repaired in place
};

export const sanitizeString = str => {
  const cleanedString = sanitize(str, '-');
  // const cleanedString = str.replace(/[^a-z0-9áéíóúñü$. ,_-]/gim,"");
  return cleanedString.trim();
};

// generates the frameScan table name and makes it sql compatible
export const getFrameScanTableName = fileId => {
  if (fileId === undefined) {
    return undefined;
  }
  const tableName = `frameScan_${fileId.replace(/-/g, '_')}`;
  return tableName;
};

// sort detectionArray by ...
export const sortArray = (
  detectionArray,
  sortAndFilterMethod = SORT_METHOD.FACESIZE,
  reverseSortOrder = false,
  optionalSortProperties = undefined,
) => {
  let sortedAndFilteredArray = [];
  const sortOrderMultiplier = reverseSortOrder ? -1 : 1;
  switch (sortAndFilterMethod) {
    case SORT_METHOD.FRAMENUMBER:
      sortedAndFilteredArray = detectionArray
        .slice()
        .sort((a, b) => (a.frameNumber > b.frameNumber ? sortOrderMultiplier * 1 : sortOrderMultiplier * -1));
      // .map(item => item.frameNumber);
      break;
    case SORT_METHOD.FACESIZE:
      sortedAndFilteredArray = detectionArray
        .slice()
        .filter(item => item.faceCount !== 0) // filter out frames with no faces
        .sort((a, b) => (a.largestSize < b.largestSize ? sortOrderMultiplier * 1 : sortOrderMultiplier * -1));
      // .map(item => item.frameNumber);
      break;
    case SORT_METHOD.FACECOUNT:
      sortedAndFilteredArray = detectionArray
        .slice()
        .filter(item => item.faceCount !== 0) // filter out frames with no faces
        .sort((a, b) => (a.faceCount < b.faceCount ? sortOrderMultiplier * 1 : sortOrderMultiplier * -1));
      // .map(item => item.frameNumber);
      break;
    case SORT_METHOD.FACECONFIDENCE: {
      // filtered and flatten the detectionArray
      const detectionArrayFiltered = detectionArray.filter(item => item.faceCount !== 0); // filter out frames with no faces
      const flattenedArray = getFlattenedArray(detectionArrayFiltered);

      // sort
      flattenedArray.sort((a, b) => (a.score < b.score ? sortOrderMultiplier * 1 : sortOrderMultiplier * -1));

      // only keep first occurrence of frameNumber
      sortedAndFilteredArray = flattenedArray.filter(
        (item, index, self) => index === self.findIndex(t => t.frameNumber === item.frameNumber),
      );
      // sortedAndFilteredArray =
      break;
    }
    case SORT_METHOD.FACEOCCURRENCE: {
      // filtered and flatten the detectionArray
      const detectionArrayFiltered = detectionArray.filter(item => item.faceCount !== 0); // filter out frames with no faces
      const flattenedArray = getFlattenedArrayWithOccurrences(detectionArrayFiltered);
      // console.log(flattenedArray.map(item => ({ faceGroupNumber: item.faceGroupNumber, size: item.size, occurrence: item.occurrence })));

      // sort by count, size and then score
      flattenedArray.sort((a, b) => {
        // Sort by count number
        if (a.occurrence < b.occurrence) return sortOrderMultiplier * 1;
        if (a.occurrence > b.occurrence) return sortOrderMultiplier * -1;

        // If the count number is the same between both items, sort by size
        if (a.size < b.size) return sortOrderMultiplier * 1;
        if (a.size > b.size) return sortOrderMultiplier * -1;

        // If the count number is the same between both items, sort by size
        if (a.score < b.score) return sortOrderMultiplier * 1;
        if (a.score > b.score) return sortOrderMultiplier * -1;
        return -1;
      });

      // only keep first occurrence of frameNumber
      sortedAndFilteredArray = flattenedArray.filter(
        (item, index, self) => index === self.findIndex(t => t.frameNumber === item.frameNumber),
      );
      break;
    }
    case SORT_METHOD.DISTTOORIGIN: {
      // filtered and flatten the detectionArray
      const detectionArrayFiltered = detectionArray.filter(item => item.faceCount !== 0); // filter out frames with no faces
      const { faceIdOfOrigin } = optionalSortProperties;

      if (detectionArrayFiltered.length > 0 && faceIdOfOrigin !== undefined) {
        console.log(faceIdOfOrigin);

        if (faceIdOfOrigin !== undefined) {
          const flattenedArray = getFlattenedArrayWithOccurrences(detectionArrayFiltered);
          console.log(flattenedArray);

          // filter array to only include faceIdOfOrigin
          flattenedArray.filter(item => item.faceGroupNumber === faceIdOfOrigin);

          // sort by distToOrigin
          flattenedArray.sort((a, b) => {
            // Sort by distToOrigin
            if (a.distToOrigin > b.distToOrigin) return sortOrderMultiplier * 1;
            if (a.distToOrigin < b.distToOrigin) return sortOrderMultiplier * -1;
            return -1;
          });

          // only keep first occurrence of frameNumber
          sortedAndFilteredArray = flattenedArray.filter(
            (item, index, self) => index === self.findIndex(t => t.frameNumber === item.frameNumber),
          );
        }
      }
      break;
    }
    case SORT_METHOD.UNIQUE:
      // filtered and flatten the detectionArray
      const detectionArrayFiltered = detectionArray.filter(item => item.faceCount !== 0); // filter out frames with no faces
      const flattenedArray = getFlattenedArrayWithOccurrences(detectionArrayFiltered);

      // sort by count, size and then score
      flattenedArray.sort((a, b) => {
        // Sort by occurrence
        if (a.occurrence < b.occurrence) return sortOrderMultiplier * 1;
        if (a.occurrence > b.occurrence) return sortOrderMultiplier * -1;

        // If the count number is the same between both items, sort by size
        if (a.size < b.size) return sortOrderMultiplier * 1;
        if (a.size > b.size) return sortOrderMultiplier * -1;

        // If the count number is the same between both items, sort by size
        if (a.score < b.score) return sortOrderMultiplier * 1;
        if (a.score > b.score) return sortOrderMultiplier * -1;
        return -1;
      });

      // get only origins
      sortedAndFilteredArray = flattenedArray.filter(item => item.distToOrigin === 0);
      // only keep first occurrence of faceGroupNumber
      // sortedAndFilteredArray = flattenedArray.filter(
      //   (item, index, self) => index === self.findIndex(t => t.faceGroupNumber === item.faceGroupNumber),
      // );
      break;
    default:
  }
  console.log(sortedAndFilteredArray);
  return sortedAndFilteredArray;
};

export const getFlattenedArray = detectionArray => {
  const flattenedArray = [];
  detectionArray.map(item => {
    const { facesArray, ...rest } = item;
    if (facesArray !== undefined) {
      facesArray.map(face => {
        flattenedArray.push({ ...face, ...rest });
        return undefined;
      });
    }
    return undefined;
  });
  return flattenedArray;
};

export const getFlattenedArrayWithOccurrences = detectionArray => {
  const arrayOfOccurrences = getArrayOfOccurrences(detectionArray);
  const flattenedArray = getFlattenedArray(detectionArray);
  flattenedArray.forEach(item => {
    // convert object to array and find occurrence and add to item
    const { count } = Object.values(arrayOfOccurrences).find(item2 => item2.faceGroupNumber === item.faceGroupNumber);
    item.occurrence = count;
  });
  return flattenedArray;
};

export const getArrayOfOccurrences = detectionArray => {
  // flatten the detectionArray
  const flattenedArray = getFlattenedArray(detectionArray);
  const arrayOfOccurrences = flattenedArray.reduce((acc, curr) => {
    if (acc[curr.faceGroupNumber] === undefined) {
      acc[curr.faceGroupNumber] = { count: 1, faceGroupNumber: curr.faceGroupNumber };
    } else {
      acc[curr.faceGroupNumber].count += 1;
    }
    return acc;
  }, {});
  // console.log(arrayOfOccurrences);
  // console.log(typeof arrayOfOccurrences);

  return arrayOfOccurrences;
};

export const determineAndInsertFaceGroupNumber = (detectionArray, defaultFaceUniquenessThreshold) => {
  // this function determines unique faces and adds the faceGroupNumber into the detectionArray
  // initialise the faceGroupNumber
  let faceGroupNumber = 0;
  const uniqueFaceArray = [];
  detectionArray.forEach(frame => {
    if (frame.faceCount !== 0) {
      frame.facesArray.forEach(face => {
        const currentFaceDescriptor = Object.values(face.faceDescriptor);
        const uniqueFaceArrayLength = uniqueFaceArray.length;
        if (uniqueFaceArrayLength === 0) {
          uniqueFaceArray.push(currentFaceDescriptor); // convert array
          face.faceGroupNumber = faceGroupNumber;
          face.distToOrigin = 0;
        } else {
          // compare descriptor value with all values in the array
          for (let i = 0; i < uniqueFaceArrayLength; i += 1) {
            const dist = faceapi.euclideanDistance(currentFaceDescriptor, uniqueFaceArray[i]);
            // console.log(dist);
            // check how close the faces are
            if (dist < defaultFaceUniquenessThreshold) {
              // faces are similar or equal
              // console.log(
              //   dist === 0
              //   ? `this and face ${i} are identical: ${dist}`
              //   : `this and face ${i} are probably the same: ${dist}`,
              // );
              faceGroupNumber = i;
              face.faceGroupNumber = faceGroupNumber;
              face.distToOrigin = roundNumber(dist);
              break;
            } else if (i === uniqueFaceArrayLength - 1) {
              // face is unique
              // if no match was found add the current descriptor to the array marking a new unique face
              // console.log(`this face is unique: ${dist}`);
              uniqueFaceArray.push(currentFaceDescriptor); // convert array
              faceGroupNumber = uniqueFaceArrayLength;
              face.faceGroupNumber = faceGroupNumber;
              face.distToOrigin = 0;
            }
          }
        }
        return undefined;
      });
    }
    return undefined;
  });
};

export const getOccurrencesOfFace = (detectionArray, frameNumber, defaultFaceUniquenessThreshold) => {
  // returns an array of foundFrames where this face occurrs
  // initialise the foundFrames
  const foundFrames = [];

  const frameOfFace = detectionArray.find(frame => frame.frameNumber === frameNumber);
  console.log(frameOfFace);
  if (frameOfFace === undefined || frameOfFace.facesArray === undefined || frameOfFace.facesArray.length === 0) {
    return []; // return an empty array as there where no occurrences
  }

  // use first face in array to search for
  // later it would be nice if one can specify which face on an array to search for
  const faceIdOfOrigin = frameOfFace.facesArray[0].faceId;
  const faceDescriptorOfFace = Object.values(frameOfFace.facesArray[0].faceDescriptor);

  detectionArray.forEach(frame => {
    if (frame.faceCount !== 0) {
      const foundFaces = [];
      frame.facesArray.forEach(face => {
        const currentFaceDescriptor = Object.values(face.faceDescriptor);
        // compare descriptor value with faceDescriptorOfFace
        const dist = faceapi.euclideanDistance(currentFaceDescriptor, faceDescriptorOfFace);
        console.log(dist);
        // if no match was found add the current descriptor to the array marking a unique face
        if (dist < defaultFaceUniquenessThreshold) {
          console.log(dist === 0 ? `this face is identical: ${dist}` : `this face is probably the same: ${dist}`);
          foundFaces.push({ ...face, distToOrigin: dist, faceDescriptor: undefined });
        } else if (foundFaces.length > 0) { // only add other faces if one face is similar
          console.log(`this face is different: ${dist}`);
          foundFaces.push({ ...face, faceDescriptor: undefined });
        }
        return undefined;
      });
      if (foundFaces.length > 0) {
        foundFrames.push({ ...frame, facesArray: foundFaces });
      }
    }
    return undefined;
  });
  return {
    faceIdOfOrigin,
    foundFrames,
  };
};

export const insertOccurrence = detectionArray => {
  // this function determines occurrences and adds them to the detectionArray
  // insert occurrence into detectionArray
  const arrayOfOccurrences = getArrayOfOccurrences(detectionArray);
  console.log(arrayOfOccurrences);
  detectionArray.forEach(frame => {
    if (frame.facesArray !== undefined) {
      frame.facesArray.forEach(face => {
        // convert object to array and find occurrence and add to item
        const { count } = Object.values(arrayOfOccurrences).find(item => item.faceGroupNumber === face.faceGroupNumber);
        /* eslint no-param-reassign: ["error", { "props": false }] */
        face.occurrence = count;
      });
    }
  });
};

export const getIntervalArray = (
  amount,
  start,
  stop,
  maxValue,
  limitToMaxValue = false, // in some cases it can be allowed to go over
) => {
  // amount should not be more than the maxValue
  // stop - start should be at least amount
  let newStart = start;
  let newStop = stop;
  const range = stop - start;

  let newAmount = Math.min(amount, maxValue - 1);
  if (range < newAmount) {
    if (limitToMaxValue) {
      newAmount = range + 1;
    } else {
      newStop = start + newAmount;
      if (newStop > maxValue - 1) {
        newStart = Math.max(0, maxValue - 1 - newAmount);
        newStop = newStart + newAmount;
      }
    }
  }
  // log.debug(`${amount} : ${newAmount} : ${start} : ${newStart} : ${stop} : ${newStop} : `);

  const startWithBoundaries = limitRange(newStart, 0, maxValue - 1);
  const stopWithBoundaries = limitRange(newStop, 0, maxValue - 1);
  const frameNumberArray = Array.from(Array(newAmount).keys()).map(x =>
    mapRange(x, 0, newAmount - 1, startWithBoundaries, stopWithBoundaries, true),
  );
  return frameNumberArray;
};

export const sortThumbsArray = (thumbsArray, sortOrderArray) => {
  // extract frameNumbers
  const frameNumberArrayFromFaceDetection = sortOrderArray.map(item => item.frameNumber);
  console.log(frameNumberArrayFromFaceDetection);
  console.log(thumbsArray);

  // let filteredArray = thumbsArray;
  // if (hideOthers) {
  //   // filter thumbsArray by frameNumberArrayFromFaceDetection
  //   filteredArray = thumbsArray.filter(item => frameNumberArrayFromFaceDetection.includes(item.frameNumber));
  // }

  const thumbsArrayAfterSorting = thumbsArray.slice().sort((a, b) => {
    return (
      frameNumberArrayFromFaceDetection.indexOf(a.frameNumber) -
      frameNumberArrayFromFaceDetection.indexOf(b.frameNumber)
    );
  });
  console.log(thumbsArrayAfterSorting);
  return thumbsArrayAfterSorting;
};

export const getFrameNumberWithSceneOrThumbId = (sheetsByFileId, fileId, sheetId, thumbId) => {
  if (
    thumbId === undefined ||
    fileId === undefined ||
    sheetId === undefined ||
    sheetsByFileId === undefined ||
    sheetsByFileId[fileId] === undefined ||
    sheetsByFileId[fileId][sheetId] === undefined ||
    sheetsByFileId[fileId][sheetId].thumbsArray === undefined
  ) {
    return undefined;
  }
  const { thumbsArray } = sheetsByFileId[fileId][sheetId];
  const thumb = thumbsArray.find(item => item.thumbId === thumbId);
  const { frameNumber } = thumb;
  return frameNumber;
};

export const getFrameNumberArrayOfOccurrences = (detectionArray, faceGroupNumber) => {
  // flatten the detectionArray
  const flattenedArray = getFlattenedArray(detectionArray);
  const frameNumberArray = [];
  flattenedArray.map(face => {
    if (face.faceGroupNumber === faceGroupNumber) {
      frameNumberArray.push(face.frameNumber);
    }
    return undefined;
  });
  console.log(flattenedArray);
  console.log(frameNumberArray);

  return frameNumberArray;
};

export const getCropWidthAndHeight = (transformObject, videoWidth, videoHeight) => {
  let cropTop = 0;
  let cropBottom = 0;
  let cropLeft = 0;
  let cropRight = 0;
  if (transformObject !== undefined && transformObject !== null) {
    log.debug(transformObject);
    cropTop = transformObject.cropTop;
    cropBottom = transformObject.cropBottom;
    cropLeft = transformObject.cropLeft;
    cropRight = transformObject.cropRight;
  }
  const cropWidth = videoWidth - cropLeft - cropRight;
  const cropHeight = videoHeight - cropTop - cropBottom;
  return {
    cropTop,
    cropLeft,
    cropWidth,
    cropHeight,
  };
};

export const deleteFaceDescriptorFromFaceScanArray = faceScanArray => {
  // note!!! this is a mutating function
  faceScanArray.map(frame => {
    // loop through all frames
    if (frame.facesArray !== undefined) {
      frame.facesArray.map(face => {
        // loop through all faces
        delete face.faceDescriptor;
        return undefined;
      });
    }
    return undefined;
  });
  return faceScanArray;
};
