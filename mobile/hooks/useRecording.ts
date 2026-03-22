import { useState, useRef } from "react";
import { Audio } from "expo-av";
import { api } from "../lib/api";

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  async function startRecording(): Promise<void> {
    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.warn("Audio recording permission not granted");
        return;
      }

      // Configure audio mode for recording during calls
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error("Start recording error:", err);
    }
  }

  async function stopRecording(): Promise<string | null> {
    try {
      const recording = recordingRef.current;
      if (!recording) return null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      return uri;
    } catch (err) {
      console.error("Stop recording error:", err);
      setIsRecording(false);
      return null;
    }
  }

  async function uploadRecording(callId: string, fileUri: string): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append("audio", {
        uri: fileUri,
        type: "audio/m4a",
        name: `call-${callId}.m4a`,
      } as any);

      await api.upload(`/calls/${callId}/recording`, formData);
      return true;
    } catch (err) {
      console.error("Upload recording error:", err);
      return false;
    }
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
    uploadRecording,
  };
}
