import React, { Component, PropTypes } from 'react';
import { View } from 'react-native';

import translateWithAnimation from '../../utils/translateWithAnimation';

export default class TranslateAnimatedView extends Component {
  static propTypes = {
    containerStyle: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.array,
    ]),
  };

  static defaultProps = {
    containerStyle: {},
  };

  async animatedTranslate(origPosition, destPosition, spring, speed) {
    try {
      await translateWithAnimation(this.ref, origPosition, destPosition, spring, speed);
    }
    catch(error) {
      console.error(error);
    }
  }

  render() {
    let style = [];
    if (Array.isArray(this.props.containerStyle)) {
      style = this.props.containerStyle;
    }
    else if (typeof this.props.containerStyle === 'object') {
      style.push(this.props.containerStyle);
    }

    return (
      <View
        ref={instance => {
          this.ref = instance;
        }}
        style={style}
      >
        {this.props.children}
      </View>
    );
  }
}
