import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, PlatformColor } from 'react-native';

const tabColor = DynamicColorIOS({
  dark: 'white',
  light: 'black',
});

export default function TabsLayout() {
  return (
    <NativeTabs
      blurEffect="systemChromeMaterial"
      iconColor={{ default: PlatformColor('secondaryLabel'), selected: tabColor }}
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

      <NativeTabs.Trigger name="audio">
        <NativeTabs.Trigger.Icon
          md="play_circle"
          sf={{ default: 'play.circle', selected: 'play.circle.fill' }}
        />
        <NativeTabs.Trigger.Label>Audio</NativeTabs.Trigger.Label>
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
