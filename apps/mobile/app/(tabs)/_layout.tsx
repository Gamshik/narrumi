import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { ReactElement } from 'react';
import {
  DynamicColorIOS,
  Platform,
  PlatformColor,
  type ColorValue,
} from 'react-native';

// The tab icon color follows the active iOS appearance without custom theme glue.
const tabColor: ColorValue =
  Platform.OS === 'ios'
    ? DynamicColorIOS({
        dark: 'white',
        light: 'black',
      })
    : '#000000';
// The default icon color uses the native semantic label only where available.
const defaultTabColor: ColorValue =
  Platform.OS === 'ios' ? PlatformColor('secondaryLabel') : '#8e8e93';

// Route layout contract: configures the native bottom tab shell for all main screens.
export default function TabsLayout(): ReactElement {
  return (
    <NativeTabs
      blurEffect="systemChromeMaterial"
      iconColor={{ default: defaultTabColor, selected: tabColor }}
      labelStyle={{ color: tabColor }}
      minimizeBehavior="automatic"
      tintColor={tabColor}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          md="home"
          sf={{ default: 'house', selected: 'house.fill' }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="dictionary">
        <NativeTabs.Trigger.Icon
          md="menu_book"
          sf={{ default: 'book', selected: 'book.fill' }}
        />
        <NativeTabs.Trigger.Label>Dictionary</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          md="settings"
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
