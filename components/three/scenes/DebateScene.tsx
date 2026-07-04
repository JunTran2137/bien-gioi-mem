'use client';

import { useState, useMemo } from 'react';
import { VnText as Text } from '../primitives/VnText';
import { useDebateGame } from '@/hooks/useDebateGame';
import { hex, palette } from '@/lib/three/theme';
import { Button3D } from '../primitives/Button3D';
import { TextInput3D } from '../primitives/TextInput3D';
import { useTextInput } from '@/lib/three/useTextInput';
import { Person } from './parts/Person';

const POS: [number, number, number] = [34, 0, -34];

export function DebateScene() {
  const d = useDebateGame();

  const audience = useMemo(() => {
    const arr: { x: number; z: number; y: number; rot: number; seed: number }[] = [];
    const tiers = [
      { r: 11, count: 22, y: 0.5 },
      { r: 13, count: 28, y: 1.4 }
    ];
    let s = 0;
    for (const t of tiers) {
      for (let i = 0; i < t.count; i++) {
        const a = (i / t.count) * Math.PI * 2;
        arr.push({
          x: Math.cos(a) * t.r,
          z: Math.sin(a) * t.r,
          y: t.y,
          rot: -a + Math.PI / 2 + Math.PI,
          seed: ++s * 0.137
        });
      }
    }
    return arr;
  }, []);

  return (
    <group position={POS}>
      {/* Stadium dome */}
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[16, 16, 16, 32, 1, true]} />
        <meshStandardMaterial color="#3A4F6B" side={2} roughness={0.9} />
      </mesh>
      <mesh position={[0, 16, 0]}>
        <sphereGeometry args={[16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2A3A50" side={2} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[10, 48]} />
        <meshStandardMaterial color="#D4A86A" roughness={0.85} />
      </mesh>
      {[
        { r: 10.5, ri: 11.5, y: 0 },
        { r: 11.5, ri: 13.5, y: 0.9 }
      ].map((tier, i) => (
        <mesh key={`tier-${i}`} position={[0, tier.y, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[tier.r, tier.ri, 48]} />
          <meshStandardMaterial color="#4A5C7A" roughness={0.8} />
        </mesh>
      ))}
      {audience.map((a, i) => (
        <Person key={`aud-${i}`} position={[a.x, a.y, a.z]} rotationY={a.rot} pose="sit" seed={a.seed} scale={0.85} />
      ))}

      <pointLight position={[0, 6, 4]} color="#E8F4FF" intensity={1.2} distance={18} />
      <pointLight position={[-5, 4, 2]} color="#FFE8B8" intensity={0.6} distance={12} />
      <pointLight position={[5, 4, 2]} color="#FFE8B8" intensity={0.6} distance={12} />

      {(!d.state || d.state.phase === 'WAITING') && <LobbyView />}
      {d.state?.phase === 'PREP' && <PrepView />}
      {d.state?.phase === 'SPEAKING' && <SpeakingView />}
      {d.state?.phase === 'REBUTTAL' && <RebuttalView />}
      {d.state?.phase === 'RESPONSE' && <ResponseView />}
      {d.state?.phase === 'VOTING' && <VotingView />}
      {d.state?.phase === 'FINISHED' && <FinishedView />}
    </group>
  );
}

function HeaderBar({ title, sub }: { title: string; sub: string }) {
  const d = useDebateGame();
  return (
    <group>
      <mesh position={[0, 7.4, -0.5]} castShadow>
        <boxGeometry args={[10, 1.5, 0.15]} />
        <meshStandardMaterial color={hex.secondary} />
      </mesh>
      <Text position={[0, 7.7, -0.4]} fontSize={0.18} color="#fff" anchorX="center" anchorY="middle">
        {title}
      </Text>
      <Text position={[0, 7.2, -0.4]} fontSize={0.14} color="#E8F4FF" anchorX="center" anchorY="middle" maxWidth={9.5} textAlign="center">
        {sub}
      </Text>
      {d.state?.deadline && d.timeLeft > 0 && (
        <Text position={[0, 6.6, -0.4]} fontSize={0.22} color={d.timeLeft < 10 ? hex.danger : hex.gold} anchorX="center" anchorY="middle" bold>
          ⏱ {d.timeLeft}s
        </Text>
      )}
    </group>
  );
}

function LobbyView() {
  const d = useDebateGame();
  return (
    <group>
      <mesh position={[0, 5, -0.5]} castShadow>
        <boxGeometry args={[8, 3, 0.2]} />
        <meshPhysicalMaterial color="#fff" roughness={0.2} clearcoat={0.5} />
      </mesh>
      <Text position={[0, 6, -0.35]} fontSize={0.22} color={hex.muted} anchorX="center" anchorY="middle">
        PHÒNG TRANH LUẬN
      </Text>
      <Text position={[0, 5.3, -0.35]} fontSize={0.7} color={hex.secondary} anchorX="center" anchorY="middle" bold>
        {d.roomCode}
      </Text>
      <Text position={[0, 4.3, -0.35]} fontSize={0.14} color={hex.muted} anchorX="center" anchorY="middle" maxWidth={7} textAlign="center">
        Mỗi nhóm sẽ được phân quan điểm ngẫu nhiên — bảo vệ bằng lý lẽ.
      </Text>

      {d.state?.players.slice(0, 8).map((p, i) => (
        <group key={p.uid} position={[-3.5 + (i % 4) * 2.3, 2.6 - Math.floor(i / 4) * 0.6, 0]}>
          <mesh>
            <boxGeometry args={[2.1, 0.5, 0.1]} />
            <meshStandardMaterial color={hex.primarySoft} />
          </mesh>
          <Text position={[0, 0, 0.1]} fontSize={0.13} color={hex.text} anchorX="center" anchorY="middle" maxWidth={2}>
            {p.name.slice(0, 16)} {p.groupName ? `(${p.groupName.slice(0, 8)})` : ''}
          </Text>
        </group>
      ))}

      {d.isHostMe && (
        <Button3D position={[0, 1, 1]} width={3} height={0.9} color={palette.secondary} onClick={d.startGame}>
          <Text position={[0, 0, 0.18]} fontSize={0.25} color="#fff" anchorX="center" anchorY="middle" bold>
            ▶ Bắt đầu
          </Text>
        </Button3D>
      )}
    </group>
  );
}

function PrepView() {
  const d = useDebateGame();
  const ti = useTextInput();
  const topic = d.myGroupState?.topic;
  return (
    <group>
      <HeaderBar title="📝 GIAI ĐOẠN CHUẨN BỊ" sub="Đọc chủ đề & viết luận điểm mở đầu" />
      {topic && (
        <group>
          <mesh position={[0, 5.2, 0]} castShadow>
            <boxGeometry args={[9, 2.2, 0.15]} />
            <meshPhysicalMaterial color="#fff" roughness={0.2} clearcoat={0.5} />
          </mesh>
          <Text position={[0, 5.8, 0.1]} fontSize={0.2} color={hex.primary} anchorX="center" anchorY="middle" maxWidth={8.5} textAlign="center" bold>
            {topic.title}
          </Text>
          <Text position={[0, 5.2, 0.1]} fontSize={0.14} color={hex.secondary} anchorX="center" anchorY="middle" maxWidth={8.5} textAlign="center" fontStyle="italic">
            Quan điểm của bạn: {topic.side}
          </Text>
          <Text position={[0, 4.5, 0.1]} fontSize={0.12} color={hex.text} anchorX="center" anchorY="middle" maxWidth={8.5} textAlign="center" lineHeight={1.4}>
            {topic.context.slice(0, 200)}
          </Text>
        </group>
      )}

      <Text position={[-4, 3.4, 0.1]} fontSize={0.13} color={hex.muted} anchorX="left" anchorY="middle">
        Gợi ý: {topic?.argumentStarters?.[0]?.slice(0, 60)}…
      </Text>

      <TextInput3D
        id="debate-arg-prep"
        position={[0, 2.5, 0.5]}
        width={8}
        height={0.95}
        placeholder="Viết luận điểm mở đầu của nhóm…"
        multiline
        maxLength={400}
        onSubmit={(v) => { d.sendArg(v); ti.setValue('debate-arg-prep', ''); ti.blur(); }}
      />
      <Button3D
        position={[0, 1.4, 0.5]}
        width={2.6}
        height={0.7}
        color={palette.primary}
        onClick={() => {
          const v = ti.values['debate-arg-prep'] || '';
          if (v.trim()) { d.sendArg(v); ti.setValue('debate-arg-prep', ''); ti.blur(); }
        }}
      >
        <Text position={[0, 0, 0.18]} fontSize={0.16} color="#fff" anchorX="center" anchorY="middle" bold>
          📨 Gửi luận điểm
        </Text>
      </Button3D>

      <Text position={[0, 0.7, 0.5]} fontSize={0.12} color={hex.muted} anchorX="center" anchorY="middle">
        Đã viết: {d.myGroupState?.arguments.length || 0} luận điểm
      </Text>
    </group>
  );
}

function SpeakingView() {
  const d = useDebateGame();
  const ti = useTextInput();
  return (
    <group>
      <HeaderBar
        title={`🎤 ${d.speakingGS?.groupName || 'Nhóm'} đang trình bày`}
        sub={d.speakingGS?.topic?.title || ''}
      />

      {/* Speaking group's arguments */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[9, 3, 0.15]} />
        <meshPhysicalMaterial color="#fff" roughness={0.2} />
      </mesh>
      {d.speakingGS?.arguments.slice(0, 4).map((arg, i) => (
        <Text
          key={i}
          position={[-4.2, 5.6 - i * 0.55, 0.1]}
          fontSize={0.13}
          color={hex.text}
          anchorX="left"
          anchorY="middle"
          maxWidth={8.4}
          lineHeight={1.4}
        >
          • {arg.slice(0, 180)}
        </Text>
      ))}

      {/* Reaction buttons - audience */}
      {!d.isMyGroupSpeaking && (
        <group position={[0, 2.5, 0.5]}>
          <Text position={[0, 0.6, 0]} fontSize={0.13} color={hex.muted} anchorX="center" anchorY="middle">
            Phản ứng:
          </Text>
          {[
            { k: 'clap' as const, icon: '👏', count: d.speakingGS?.reactions.clap || 0 },
            { k: 'think' as const, icon: '🤔', count: d.speakingGS?.reactions.think || 0 },
            { k: 'exclaim' as const, icon: '❗', count: d.speakingGS?.reactions.exclaim || 0 },
          ].map((r, i) => (
            <Button3D
              key={r.k}
              position={[-1.6 + i * 1.6, 0, 0]}
              width={1.4}
              height={0.7}
              color={palette.gold}
              onClick={() => d.react(r.k)}
            >
              <Text position={[0, 0, 0.18]} fontSize={0.16} color="#fff" anchorX="center" anchorY="middle">
                {r.icon} {r.count}
              </Text>
            </Button3D>
          ))}
        </group>
      )}

      {/* If my group is speaking, allow more arguments */}
      {d.isMyGroupSpeaking && (
        <group position={[0, 2.2, 0.5]}>
          <TextInput3D
            id="debate-arg-speak"
            position={[0, 0.3, 0]}
            width={7}
            height={0.85}
            placeholder="Bổ sung luận điểm…"
            multiline
            maxLength={300}
            onSubmit={(v) => { d.sendArg(v); ti.setValue('debate-arg-speak', ''); }}
          />
          <Button3D
            position={[0, -0.75, 0]}
            width={2.2}
            height={0.6}
            color={palette.primary}
            onClick={() => {
              const v = ti.values['debate-arg-speak'] || '';
              if (v.trim()) { d.sendArg(v); ti.setValue('debate-arg-speak', ''); }
            }}
          >
            <Text position={[0, 0, 0.18]} fontSize={0.14} color="#fff" anchorX="center" anchorY="middle">📨 Gửi</Text>
          </Button3D>
        </group>
      )}
    </group>
  );
}

function RebuttalView() {
  const d = useDebateGame();
  const ti = useTextInput();
  return (
    <group>
      <HeaderBar title="⚔️ PHẢN BÁC" sub={`Chất vấn ${d.speakingGS?.groupName || ''}`} />
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[9, 2.5, 0.15]} />
        <meshPhysicalMaterial color="#FFF7E8" roughness={0.2} />
      </mesh>
      {d.speakingGS?.arguments.slice(0, 3).map((arg, i) => (
        <Text
          key={i}
          position={[-4.2, 5.3 - i * 0.55, 0.1]}
          fontSize={0.12}
          color={hex.text}
          anchorX="left"
          anchorY="middle"
          maxWidth={8.4}
          lineHeight={1.4}
        >
          • {arg.slice(0, 160)}
        </Text>
      ))}

      <TextInput3D
        id="debate-challenge"
        position={[0, 2.5, 0.5]}
        width={8}
        height={0.9}
        placeholder="Viết câu chất vấn…"
        multiline
        maxLength={300}
        onSubmit={(v) => { d.sendChallenge(v); ti.setValue('debate-challenge', ''); }}
      />
      <Button3D
        position={[0, 1.4, 0.5]}
        width={2.6}
        height={0.7}
        color={palette.accent}
        onClick={() => {
          const v = ti.values['debate-challenge'] || '';
          if (v.trim()) { d.sendChallenge(v); ti.setValue('debate-challenge', ''); }
        }}
      >
        <Text position={[0, 0, 0.18]} fontSize={0.16} color="#fff" anchorX="center" anchorY="middle" bold>
          ⚔ Gửi chất vấn
        </Text>
      </Button3D>
    </group>
  );
}

function ResponseView() {
  const d = useDebateGame();
  const ti = useTextInput();
  const challenges = d.myGroupState?.challenges || [];
  return (
    <group>
      <HeaderBar title="💬 PHẢN HỒI" sub="Trả lời các câu chất vấn" />
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[9, 2.5, 0.15]} />
        <meshPhysicalMaterial color="#FFF7E8" roughness={0.2} />
      </mesh>
      {challenges.slice(0, 3).map((c, i) => (
        <Text
          key={i}
          position={[-4.2, 5.3 - i * 0.55, 0.1]}
          fontSize={0.12}
          color={hex.accent}
          anchorX="left"
          anchorY="middle"
          maxWidth={8.4}
          lineHeight={1.4}
        >
          [{c.fromGroupName}] {c.text.slice(0, 140)}
        </Text>
      ))}

      <TextInput3D
        id="debate-response"
        position={[0, 2.5, 0.5]}
        width={8}
        height={0.9}
        placeholder="Viết phản hồi…"
        multiline
        maxLength={300}
        onSubmit={(v) => { d.sendResponse(v); ti.setValue('debate-response', ''); }}
      />
      <Button3D
        position={[0, 1.4, 0.5]}
        width={2.6}
        height={0.7}
        color={palette.secondary}
        onClick={() => {
          const v = ti.values['debate-response'] || '';
          if (v.trim()) { d.sendResponse(v); ti.setValue('debate-response', ''); }
        }}
      >
        <Text position={[0, 0, 0.18]} fontSize={0.16} color="#fff" anchorX="center" anchorY="middle" bold>
          💬 Gửi phản hồi
        </Text>
      </Button3D>
    </group>
  );
}

function VotingView() {
  const d = useDebateGame();
  const groups = d.state ? Object.values(d.state.groupStates) : [];
  return (
    <group>
      <HeaderBar title="🗳️ BỎ PHIẾU" sub="Chọn nhóm có lập luận thuyết phục nhất" />
      {groups.map((g, i) => {
        const x = -4.5 + (i % 3) * 4.5;
        const y = 4.5 - Math.floor(i / 3) * 2.2;
        const votes = d.state?.voteCount[g.groupId] || 0;
        const isMine = g.groupId === d.user?.groupId;
        const voted = d.myVote === g.groupId;
        return (
          <Button3D
            key={g.groupId}
            position={[x, y, 0]}
            width={4}
            height={1.8}
            color={voted ? palette.primary : palette.primarySoft}
            disabled={isMine}
            onClick={() => d.vote(g.groupId)}
            ariaLabel={`Vote ${g.groupName}`}
          >
            <Text position={[0, 0.45, 0.18]} fontSize={0.16} color={voted ? '#fff' : hex.text} anchorX="center" anchorY="middle" maxWidth={3.6}>
              {g.groupName}
            </Text>
            <Text position={[0, 0.1, 0.18]} fontSize={0.1} color={voted ? '#E8F4FF' : hex.muted} anchorX="center" anchorY="middle" maxWidth={3.6} fontStyle="italic">
              {g.topic.side?.slice(0, 50)}
            </Text>
            <Text position={[0, -0.45, 0.18]} fontSize={0.18} color={voted ? hex.gold : hex.primary} anchorX="center" anchorY="middle" bold>
              {votes} phiếu {isMine ? '(nhóm bạn)' : ''}
            </Text>
          </Button3D>
        );
      })}
    </group>
  );
}

function FinishedView() {
  const d = useDebateGame();
  const groups = d.state ? Object.values(d.state.groupStates) : [];
  const sorted = [...groups].sort((a, b) => (d.state?.voteCount[b.groupId] || 0) - (d.state?.voteCount[a.groupId] || 0));
  const maxVotes = Math.max(1, ...groups.map(g => d.state?.voteCount[g.groupId] || 0));
  return (
    <group>
      <HeaderBar title="🏁 KẾT QUẢ" sub={`Tổng ${d.totalVotes} phiếu`} />
      {sorted.map((g, i) => {
        const votes = d.state?.voteCount[g.groupId] || 0;
        const barH = (votes / maxVotes) * 3;
        const x = -3 + i * 2;
        return (
          <group key={g.groupId} position={[x, 1.5, 0]}>
            <mesh position={[0, barH / 2, 0]} castShadow>
              <boxGeometry args={[1.4, Math.max(0.1, barH), 0.6]} />
              <meshStandardMaterial
                color={i === 0 ? hex.gold : i === 1 ? hex.secondary : hex.primarySoft}
                emissive={i === 0 ? hex.gold : '#000'}
                emissiveIntensity={i === 0 ? 0.2 : 0}
              />
            </mesh>
            <Text position={[0, barH + 0.3, 0.4]} fontSize={0.18} color={hex.text} anchorX="center" anchorY="middle" bold>
              {votes}
            </Text>
            <Text position={[0, -0.3, 0.4]} fontSize={0.12} color={hex.text} anchorX="center" anchorY="middle" maxWidth={1.8} textAlign="center">
              {g.groupName}
            </Text>
            {i === 0 && (
              <Text position={[0, -0.6, 0.4]} fontSize={0.14} color={hex.gold} anchorX="center" anchorY="middle" bold>
                🏆 Thắng
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}
