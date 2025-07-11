/**
 * A wrapper class to simplify rendering to a texture instead of the final canvas
 * @module ol/webgl/RenderTarget
 */
import {equals} from '../array.js';

// for pixel color reading
const tmpArray4 = new Uint8Array(4);

/**
 * @classdesc
 * This class is a wrapper around the association of both a `WebGLTexture` and a `WebGLFramebuffer` instances,
 * simplifying initialization and binding for rendering.
 */
class WebGLRenderTarget {
  /**
   * @param {import("./Helper.js").default} helper WebGL helper; mandatory.
   * @param {Array<number>} [size] Expected size of the render target texture; note: this can be changed later on.
   */
  constructor(helper, size) {
    /**
     * @private
     * @type {import("./Helper.js").default}
     */
    this.helper_ = helper;
    const gl = helper.getGL();

    /**
     * @private
     * @type {WebGLTexture}
     */
    this.texture_ = gl.createTexture();

    /**
     * @private
     * @type {WebGLFramebuffer}
     */
    this.framebuffer_ = gl.createFramebuffer();

    /**
     * @private
     * @type {WebGLRenderbuffer}
     */
    this.depthbuffer_ = gl.createRenderbuffer();

    /**
     * @type {Array<number>}
     * @private
     */
    this.size_ = size || [1, 1];

    /**
     * @type {Uint8Array}
     * @private
     */
    this.data_ = new Uint8Array(0);

    /**
     * @type {boolean}
     * @private
     */
    this.dataCacheDirty_ = true;

    this.updateSize_();
  }

  /**
   * Changes the size of the render target texture. Note: will do nothing if the size
   * is already the same.
   * @param {Array<number>} size Expected size of the render target texture
   */
  setSize(size) {
    if (equals(size, this.size_)) {
      return;
    }
    this.size_[0] = size[0];
    this.size_[1] = size[1];
    this.updateSize_();
  }

  /**
   * Returns the size of the render target texture
   * @return {Array<number>} Size of the render target texture
   */
  getSize() {
    return this.size_;
  }

  /**
   * This will cause following calls to `#readAll` or `#readPixel` to download the content of the
   * render target into memory, which is an expensive operation.
   * This content will be kept in cache but should be cleared after each new render.
   */
  clearCachedData() {
    this.dataCacheDirty_ = true;
  }

  /**
   * Returns the full content of the frame buffer as a series of r, g, b, a components
   * in the 0-255 range (unsigned byte).
   * @return {Uint8Array} Integer array of color values
   */
  readAll() {
    if (this.dataCacheDirty_) {
      const size = this.size_;
      const gl = this.helper_.getGL();

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer_);
      gl.readPixels(
        0,
        0,
        size[0],
        size[1],
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.data_,
      );
      this.dataCacheDirty_ = false;
    }
    return this.data_;
  }

  /**
   * Reads one pixel of the frame buffer as an array of r, g, b, a components
   * in the 0-255 range (unsigned byte).
   * If x and/or y are outside of existing data, an array filled with 0 is returned.
   * @param {number} x Pixel coordinate
   * @param {number} y Pixel coordinate
   * @return {Uint8Array} Integer array with one color value (4 components)
   */
  readPixel(x, y) {
    this.readAll();
    const index =
      Math.floor(x) + (this.size_[1] - Math.floor(y) - 1) * this.size_[0];
    tmpArray4[0] = this.data_[index * 4];
    tmpArray4[1] = this.data_[index * 4 + 1];
    tmpArray4[2] = this.data_[index * 4 + 2];
    tmpArray4[3] = this.data_[index * 4 + 3];
    return tmpArray4;
  }

  /**
   * @return {WebGLTexture} Texture to render to
   */
  getTexture() {
    return this.texture_;
  }

  /**
   * @return {WebGLFramebuffer} Frame buffer of the render target
   */
  getFramebuffer() {
    return this.framebuffer_;
  }

  /**
   * @return {WebGLRenderbuffer} Depth buffer of the render target
   */
  getDepthbuffer() {
    return this.depthbuffer_;
  }

  /**
   * @private
   */
  updateSize_() {
    const size = this.size_;
    const gl = this.helper_.getGL();

    this.texture_ = this.helper_.createTexture(size, null, this.texture_);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer_);
    gl.viewport(0, 0, size[0], size[1]);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture_,
      0,
    );

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthbuffer_);
    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16,
      size[0],
      size[1],
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      this.depthbuffer_,
    );

    this.data_ = new Uint8Array(size[0] * size[1] * 4);
  }
}

export default WebGLRenderTarget;
