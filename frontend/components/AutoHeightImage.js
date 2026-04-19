import React, { useState, useEffect } from 'react';
import { Image, View } from 'react-native';

const AutoHeightImage = ({ uri, style, borderRadius = 10, resizeMode = 'cover' }) => {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(uri, (w, h) => {
      if (h > 0) setAspectRatio(w / h);
    }, () => {});
  }, [uri]);

  return (
    <View style={[{ width: '100%', borderRadius, overflow: 'hidden' }, style]}>
      <Image
        source={{ uri }}
        style={{ width: '100%', aspectRatio }}
        resizeMode={resizeMode}
      />
    </View>
  );
};

export default AutoHeightImage;
