import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { button, useControls } from "leva";
import React, { useEffect, useRef, useState } from "react";

import * as THREE from "three";
import { useSpeech } from "../hooks/useSpeech";
import facialExpressions from "../constants/facialExpressions";
import visemesMapping from "../constants/visemesMapping";
import morphTargets from "../constants/morphTargets";

export function Avatar(props) {
  const { nodes, materials, scene } = useGLTF("/models/avatar.glb");
  const { animations } = useGLTF("/models/animations.glb");
  const { message, onMessagePlayed } = useSpeech();
  const [lipsync, setLipsync] = useState();
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    if (!message) {
      console.log("No message, resetting to idle state");
      setAnimation("Idle");
      setFacialExpression("neutral");
      setLipsync(null);
      if (audio) {
        audio.pause();
        setAudio(null);
      }
      return;
    }
    
    console.group("New message received");
    console.log("Message keys:", Object.keys(message));
    if (message.visemes) {
      console.log("Visemes type:", Array.isArray(message.visemes) ? 'array' : typeof message.visemes);
      if (Array.isArray(message.visemes)) {
        console.log("First viseme:", message.visemes[0]);
      } else if (message.visemes.mouthCues) {
        console.log("Visemes has mouthCues, first one:", 
          Array.isArray(message.visemes.mouthCues) ? message.visemes.mouthCues[0] : 'not an array');
      }
    }
    if (message.lipsync) {
      console.log("Lipsync keys:", Object.keys(message.lipsync));
      if (message.lipsync.mouthCues) {
        console.log("Mouth cues type:", Array.isArray(message.lipsync.mouthCues) ? 'array' : typeof message.lipsync.mouthCues);
        if (Array.isArray(message.lipsync.mouthCues)) {
          console.log("First mouth cue:", message.lipsync.mouthCues[0]);
        }
      }
    }
    console.groupEnd();
    
    // Set animation and facial expression
    const newAnimation = message.animation || "Idle";
    const newFacialExpression = message.facialExpression || "neutral";
    
    console.log(`Setting animation: ${newAnimation}, facial expression: ${newFacialExpression}`);
    setAnimation(newAnimation);
    setFacialExpression(newFacialExpression);
    
    // Handle visemes array directly from message.visemes (array of objects with 'viseme', 'start', 'end')
    if (Array.isArray(message.visemes) && message.visemes.length > 0) {
      console.log(`[LipSync] Found ${message.visemes.length} visemes in message.visemes`);
      const mouthCues = message.visemes.map(v => ({
        value: v.viseme || v.value || 'A',  // Default to 'A' if no viseme value
        start: v.start || 0,
        end: v.end || 0.1
      }));
      console.log('Processed mouthCues:', mouthCues);
      setLipsync({
        mouthCues,
        duration: message.duration || (mouthCues.length > 0 ? mouthCues[mouthCues.length - 1].end : 0)
      });
    } 
    // Handle case where visemes are in message.visemes.mouthCues
    else if (message.visemes?.mouthCues && Array.isArray(message.visemes.mouthCues)) {
      console.log(`[LipSync] Found ${message.visemes.mouthCues.length} visemes in message.visemes.mouthCues`);
      const mouthCues = message.visemes.mouthCues.map(cue => ({
        value: cue.viseme || cue.value || 'A',
        start: cue.start || 0,
        end: cue.end || 0.1
      }));
      console.log('Processed mouthCues from visemes.mouthCues:', mouthCues);
      setLipsync({
        mouthCues,
        duration: message.visemes.duration || (mouthCues.length > 0 ? mouthCues[mouthCues.length - 1].end : 0)
      });
    }
    // Handle lipsync data in message.lipsync
    else if (message.lipsync?.mouthCues && Array.isArray(message.lipsync.mouthCues)) {
      console.log(`[LipSync] Found ${message.lipsync.mouthCues.length} mouth cues in message.lipsync`);
      const mouthCues = message.lipsync.mouthCues.map(cue => ({
        value: cue.viseme || cue.value || 'A',
        start: cue.start || 0,
        end: cue.end || 0.1
      }));
      console.log('Processed mouthCues from lipsync.mouthCues:', mouthCues);
      setLipsync({
        mouthCues,
        duration: message.lipsync.duration || (mouthCues.length > 0 ? mouthCues[mouthCues.length - 1].end : 0)
      });
    } 
    // No viseme data found
    else {
      console.warn("[LipSync] No valid viseme data found in message");
      console.log("Message structure:", JSON.stringify(message, null, 2));
      setLipsync(null);
    }
    
    // Play audio if available
    if (message.audio) {
      console.log("Initializing audio...");
      
      // Create a new audio element
      const newAudio = new Audio("data:audio/mp3;base64," + message.audio);
      
      // Set up event handlers
      newAudio.onplay = () => {
        console.log("Audio started playing");
        console.log(`Audio duration: ${newAudio.duration}s`);
      };
      
      newAudio.onerror = (e) => {
        console.error("Audio error:", e);
        console.error("Audio error details:", newAudio.error);
      };
      
      newAudio.onended = () => {
        console.log("Audio ended");
        // Reset lipsync when audio ends
        setLipsync(null);
        onMessagePlayed();
      };
      
      // Store the audio element in state
      setAudio(newAudio);
      
      // Start playing the audio after a short delay to ensure state is updated
      const playAudio = () => {
        console.log("Attempting to play audio...");
        const playPromise = newAudio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio playback started successfully");
            })
            .catch(error => {
              console.error("Error playing audio:", error);
              // Try again after a short delay
              setTimeout(() => {
                console.log("Retrying audio playback...");
                newAudio.play().catch(e => console.error("Retry failed:", e));
              }, 100);
            });
        }
      };
      
      // Try to play immediately
      playAudio();
      
      // Clean up function
      return () => {
        console.log("Cleaning up audio...");
        newAudio.pause();
        newAudio.src = '';
        newAudio.remove();
      };
    }
  }, [message]);


  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group);
  const [animation, setAnimation] = useState(animations.find((a) => a.name === "Idle") ? "Idle" : animations[0].name);
  useEffect(() => {
    if (actions[animation]) {
      actions[animation]
        .reset()
        .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
        .play();
      return () => {
        if (actions[animation]) {
          actions[animation].fadeOut(0.5);
        }
      };
    }
  }, [animation]);

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    let targetFound = false;
    
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index === undefined || child.morphTargetInfluences[index] === undefined) {
          // Debug: Log missing morph target
          if (value > 0.1 && !targetFound) {
            console.warn(`Morph target '${target}' not found in ${child.name}'s morphTargetDictionary`);
            console.log('Available morph targets:', Object.keys(child.morphTargetDictionary));
          }
          return;
        }
        
        targetFound = true;
        const currentValue = child.morphTargetInfluences[index];
        const newValue = THREE.MathUtils.lerp(currentValue, value, speed);
        
        // Only update if the value has changed significantly
        if (Math.abs(newValue - currentValue) > 0.001) {
          child.morphTargetInfluences[index] = newValue;
          // Mark the mesh as needing an update
          child.morphTargetInfluences.needsUpdate = true;
        }
      }
    });
    
    // If we're trying to set a non-zero value but didn't find the target, log a warning
    if (value > 0.1 && !targetFound) {
      console.warn(`Morph target '${target}' not found in any skinned mesh`);
    }
  };

  const [blink, setBlink] = useState(false);
  const [facialExpression, setFacialExpression] = useState("");
  const [audio, setAudio] = useState();

  // Track the last viseme to avoid spamming the console
  const lastVisemeRef = useRef(null);
  const lastLogTimeRef = useRef(0);

  useFrame(() => {
    const now = Date.now();
    
    // Handle facial expressions
    !setupMode &&
      morphTargets.forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return; // eyes wink/blink are handled separately
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });

    // Handle blinking
    lerpMorphTarget("eyeBlinkLeft", blink ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink ? 1 : 0, 0.5);

    if (setupMode) {
      return;
    }

    // Handle lip-sync with visemes array
    if (audio && lipsync?.mouthCues?.length > 0) {
      const currentAudioTime = audio.currentTime || 0;
      let currentViseme = null;
      let currentCue = null;
      
      // Find the current viseme based on audio time
      for (let i = 0; i < lipsync.mouthCues.length; i++) {
        const cue = lipsync.mouthCues[i];
        if (currentAudioTime >= cue.start && currentAudioTime <= cue.end) {
          currentViseme = cue.value || 'A'; // Default to 'A' if no value
          currentCue = cue;
          break;
        }
      }
      
      // Log viseme changes (throttled)
      if (currentViseme && currentViseme !== lastVisemeRef.current && now - lastLogTimeRef.current > 100) {
        console.log(`[LipSync] Viseme: ${currentViseme} at ${currentAudioTime.toFixed(2)}s (${currentCue?.start.toFixed(2)}-${currentCue?.end.toFixed(2)}s)`);
        lastVisemeRef.current = currentViseme;
        lastLogTimeRef.current = now;
      }
      
      // Apply viseme morph targets
      if (currentViseme) {
        // First, reset all visemes
        Object.values(visemesMapping).forEach(morphTargetName => {
          lerpMorphTarget(morphTargetName, 0, 0.2);
        });
        
        // Then apply the current viseme
        const morphTargetName = visemesMapping[currentViseme];
        if (morphTargetName) {
          lerpMorphTarget(morphTargetName, 1, 0.4);
        } else {
          console.warn(`[LipSync] No mapping found for viseme: ${currentViseme}`);
          console.log('Available viseme mappings:', Object.entries(visemesMapping));
        }
      }
    } 
    // If we have visemes but no audio, show the first viseme
    else if (lipsync?.mouthCues?.length > 0) {
      const firstViseme = lipsync.mouthCues[0]?.value || 'A';
      const morphTargetName = visemesMapping[firstViseme];
      
      if (morphTargetName && (!lastVisemeRef.current || now - lastLogTimeRef.current > 1000)) {
        console.log(`[LipSync] No audio, showing viseme: ${firstViseme}`);
        lastVisemeRef.current = firstViseme;
        lastLogTimeRef.current = now;
      }
      
      // Reset all visemes first
      Object.values(visemesMapping).forEach(name => {
        lerpMorphTarget(name, 0, 0.1);
      });
      
      // Apply the first viseme
      if (morphTargetName) {
        lerpMorphTarget(morphTargetName, 1, 0.1);
      }
    } 
    // Reset all visemes when not speaking
    else if (lipsync && lastVisemeRef.current !== null) {
      console.log('[LipSync] Resetting visemes');
      lastVisemeRef.current = null;
      Object.values(visemesMapping).forEach(morphTargetName => {
        lerpMorphTarget(morphTargetName, 0, 0.1);
      });
    }
  });

  useControls("FacialExpressions", {
    animation: {
      value: animation,
      options: animations.map((a) => a.name),
      onChange: (value) => setAnimation(value),
    },
    facialExpression: {
      options: Object.keys(facialExpressions),
      onChange: (value) => setFacialExpression(value),
    },
    setupMode: button(() => {
      setSetupMode(!setupMode);
    }),
    logMorphTargetValues: button(() => {
      const emotionValues = {};
      Object.values(nodes).forEach((node) => {
        if (node.morphTargetInfluences && node.morphTargetDictionary) {
          morphTargets.forEach((key) => {
            if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
              return;
            }
            const value = node.morphTargetInfluences[node.morphTargetDictionary[key]];
            if (value > 0.01) {
              emotionValues[key] = value;
            }
          });
        }
      });
      console.log(JSON.stringify(emotionValues, null, 2));
    }),
  });

  useControls("MorphTarget", () =>
    Object.assign(
      {},
      ...morphTargets.map((key) => {
        return {
          [key]: {
            label: key,
            value: 0,
            min: 0,
            max: 1,
            onChange: (val) => {
              lerpMorphTarget(key, val, 0.1);
            },
          },
        };
      })
    )
  );

  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  return (
    <group {...props} dispose={null} ref={group} position={[0, -0.5, 0]}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Glasses.geometry}
        material={materials.Wolf3D_Glasses}
        skeleton={nodes.Wolf3D_Glasses.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Headwear.geometry}
        material={materials.Wolf3D_Headwear}
        skeleton={nodes.Wolf3D_Headwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
    </group>
  );
}

useGLTF.preload("/models/avatar.glb");
