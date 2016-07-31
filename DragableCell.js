import React, { Component, PropTypes } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import Timer from 'react-timer-mixin';

import translateWithAnimation from '../../utils/translateWithAnimation';

const DELAY = 200;
export default class DialogContainer extends Component {
  static propTypes = {
    position: PropTypes.oneOf(['relative', 'absolute']),
    left: PropTypes.number.isRequired,
    top: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    zIndex: PropTypes.number,
    shouldSetResponder: PropTypes.bool,
    activeScale: PropTypes.number,
    activeOpacity: PropTypes.number,
    onClicked: PropTypes.func,
    onDragging: PropTypes.func,
    onDragEnd: PropTypes.func,
    onDraggingTerminate: PropTypes.func,
  };

  static defaultProps = {
    position: 'relative',
    zIndex: 1,
    shouldSetResponder: true,
    activeScale: 1.1,
    activeOpacity: 0.8,
    onClicked: () => {},
    onDragging: () => {},
    onDragEnd: () => {},
    onDraggingTerminate: () => {},
  };

  constructor(props) {
    super(props);

    this.ref = null;
    this.touchStartTime = undefined;  // The very begin timestamp of the gesture.
    this.touchActive = undefined;     // Whether should respond the gesture or not.
    this.touchIsHolding = undefined;  // Weather the gesture has ended(released) or not.
    this.selectedTouchPoint = {       // The single point that be selected to respond the gesture.
      identifier: undefined,          // The ID of the touch.
      pageX: undefined,               // The X position of the touch, relative to the root element.
      pageY: undefined,               // The Y position of the touch, relative to the root element.
    };
  }

  componentWillMount() {
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => this.props.shouldSetResponder,
      onMoveShouldSetPanResponder: () => this.props.shouldSetResponder,
      onPanResponderGrant: () => this.handlePanResponderGrant(),
      onPanResponderMove: (event) => this.handlePanResponderMove(event),
      onPanResponderRelease: (event) => this.handlePanResponderRelease(event),
      onPanResponderTerminate: () => this.handlePanResponderTerminate(),
    });
  }

  async animatedTranslate(origPosition, destPosition, spring, speed) {
    try {
      await translateWithAnimation(this.ref, origPosition, destPosition, spring, speed);
    }
    catch(error) {
      console.error(error);
    }
  }

  handlePanResponderGrant() {
    if (this.touchStartTime === undefined) {
      this.touchStartTime = Date.now();
      this.touchIsHolding = true;
      Timer.setTimeout(() => {
        if (!this.touchIsHolding) {
          // Click event.
          this.props.onClicked();
        }
        else {
          // Start to respond the touch gesture.
          this.updateNativeStyle({
            opacity: this.props.activeOpacity,
            transform: [{ scale: this.props.activeScale }],
          });
          this.touchActive = true;
        }
      }, DELAY);
    }
  }

  handlePanResponderMove(event) {
    if (!this.touchActive) {
      return;
    }

    if (this.selectedTouchPoint.identifier === undefined) {
      this.selectedTouchPoint = {
        identifier: event.nativeEvent.identifier,
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
      };
    }

    if (event.nativeEvent.identifier !== this.selectedTouchPoint.identifier) {
      return;
    }

    const dx = event.nativeEvent.pageX - this.selectedTouchPoint.pageX;
    const dy = event.nativeEvent.pageY - this.selectedTouchPoint.pageY;
    const transform = [
      { translateX: dx },
      { translateY: dy },
      { scale: this.props.activeScale },
    ];
    const style = {
      opacity: this.props.activeOpacity,
      zIndex: this.props.zIndex + 1,
      transform,
    };
    this.updateNativeStyle(style);
    this.props.onDragging({ dx, dy });
  }

  handlePanResponderRelease(event) {
    if (Date.now() - this.touchStartTime > DELAY) {
      // Drag Event.
      if (event.nativeEvent.identifier === this.selectedTouchPoint.identifier) {
        this.updateNativeStyle({
          opacity: 1,
          transform: [{ scale: 1 }],
        });
        this.props.onDragEnd();
      }
    }
    this.clearTouchInfo();
  }

  handlePanResponderTerminate() {
    this.clearTouchInfo();
    this.updateNativeStyle({
      opacity: 1,
      transform: [{ scale: 1 }],
    });
    this.props.onDraggingTerminate();
  }

  clearTouchInfo() {
    this.touchIsHolding = false;
    this.touchActive = undefined;
    this.touchStartTime = undefined;
    this.selectedTouchPoint = {};
  }

  updateNativeStyle(style) {
    if (this.ref) {
      this.ref.setNativeProps({ style });
    }
  }

  render() {
    return (
      <View
        ref={instance => {
          this.ref = instance;
        }}
        {...this.panResponder.panHandlers}
        style={[
          styles.cell,
          {
            position: this.props.position,
            left: this.props.left,
            top: this.props.top,
            width: this.props.width,
            height: this.props.height,
            zIndex: this.props.zIndex,
          },
        ]}
      >
        {this.props.children}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
