import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import ImageViewer from './ImageViewer';

const AutoHeightImage = ({ uri, style, borderRadius = 10, resizeMode = 'cover' }) => {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [viewerVisible, setViewerVisible] = useState(false);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(uri, (w, h) => {
      if (h > 0) setAspectRatio(w / h);
    }, () => {});
  }, [uri]);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setViewerVisible(true)}
        style={[{ width: '100%', borderRadius, overflow: 'hidden' }, style]}
      >
        <Image
          source={{ uri }}
          style={{ width: '100%', aspectRatio }}
          resizeMode={resizeMode}
        />
      </TouchableOpacity>
      <ImageViewer uri={uri} visible={viewerVisible} onClose={() => setViewerVisible(false)} />
    </>
  );
};

export default AutoHeightImage;
