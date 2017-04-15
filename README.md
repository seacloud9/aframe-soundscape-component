## aframe-soundscape-component

[![Version](http://img.shields.io/npm/v/aframe-aframe-soundscape-component.svg?style=flat-square)](https://npmjs.org/package/aframe-aframe-soundscape-component)
[![License](http://img.shields.io/npm/l/aframe-aframe-soundscape-component.svg?style=flat-square)](https://npmjs.org/package/aframe-aframe-soundscape-component)

Soundscape a component for utilizing sound and noise to generate terrain and landscapes that are animated

For [A-Frame](https://aframe.io).

### API

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
|          |             |               |

### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/0.4.0/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-soundscape-component/dist/aframe-aframe-soundscape-component.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity aframe-soundscape="foo: bar"></a-entity>
  </a-scene>
</body>
```

<!-- If component is accepted to the Registry, uncomment this. -->
<!--
Or with [angle](https://npmjs.com/package/angle/), you can install the proper
version of the component straight into your HTML file, respective to your
version of A-Frame:

```sh
angle install aframe-soundscape-component
```
-->

#### npm

Install via npm:

```bash
npm install aframe-soundscape-component
```

Then require and use.

```js
require('aframe');
require('aframe-aframe-soundscape-component');
```
