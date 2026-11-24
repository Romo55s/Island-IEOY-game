#!/usr/bin/env python3
"""Create cleaned game chatter without changing user originals. Requires ffmpeg/ffprobe."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'male-1': 'Voice game men 1.m4a', 'male-2': 'Voice game men 2.m4a',
    'male-4': 'Voice men 4.m4a', 'male-5': 'Voice man 5.m4a', 'male-6': 'Voice man 6.m4a',
    'female-1': 'Voice game woman 1.m4a', 'female-2': 'Voice game woman 2.m4a',
    **{f'female-{i}': f'Voice woman {i}.m4a' for i in range(3, 7)},
}

def ffmpeg(*args):
    return subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-y', *map(str, args)], check=True, capture_output=True, text=True)

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))

def loudness(path, filters=''):
    chain = (filters + ',' if filters else '') + 'loudnorm=I=-23:TP=-6:LRA=7:print_format=json'
    result = ffmpeg('-i', path, '-af', chain, '-f', 'null', '-')
    return json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]

def prepare(source_dir):
    output = ROOT / 'public/audio/voices'
    output.mkdir(parents=True, exist_ok=True)
    clips = []
    for voice_id, filename in SOURCES.items():
        source = source_dir / filename
        original = probe(source)
        duration = float(original['format']['duration'])
        detection = ffmpeg('-i', source, '-af', 'silencedetect=noise=-40dB:d=0.15', '-f', 'null', '-').stderr
        starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', detection)]
        ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', detection)]
        start = max(0, ends[0] - 0.04) if starts and ends and starts[0] < 0.02 else 0
        end = min(duration, starts[-1] + 0.06) if starts and ends and ends[-1] >= duration - 0.03 else duration
        if end - start < 0.2:
            raise ValueError(f'No usable voice signal: {filename}')
        # Keep internal pauses; modest denoising avoids flattening the recorded performance.
        filters = f'atrim=start={start}:end={end},asetpts=PTS-STARTPTS,highpass=f=180,lowpass=f=5000,afftdn=nr=6:nf=-45,acompressor=threshold=0.20:ratio=2.2:attack=10:release=140:makeup=1.2,acrusher=bits=8:mix=0.20,aresample=11025,aresample=24000,tremolo=f=14:d=0.08,aecho=0.8:0.08:36:0.06'
        stats = loudness(source, filters)
        normalize = f"loudnorm=I=-23:TP=-6:LRA=7:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true"
        filters += f',{normalize},afade=t=in:d=0.015,afade=t=out:st={max(0,end-start-0.025)}:d=0.025'
        target = output / f'{voice_id}.mp3'
        ffmpeg('-i', source, '-map', '0:a:0', '-vn', '-af', filters, '-ac', '1', '-ar', '24000', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', '40k', '-id3v2_version', '0', '-write_id3v1', '0', target)
        measured = loudness(target)
        info = probe(target)
        if float(measured['input_tp']) > -5.5:
            raise ValueError(f'Output peak above headroom limit: {voice_id}')
        clips.append({'id': voice_id, 'pool': voice_id.split('-')[0], 'file': f'/audio/voices/{voice_id}.mp3', 'source': filename,
                      'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'durationSeconds': round(float(info['format']['duration']), 4),
                      'sampleRate': 24000, 'channels': 1, 'encodedBitrateKbps': 40, 'integratedLufs': float(measured['input_i']), 'truePeakDbtp': float(measured['input_tp']),
                      'trimStartSeconds': round(start,4), 'trimEndSeconds': round(duration-end,4), 'bytes': target.stat().st_size})
        print(f"{voice_id}: {clips[-1]['durationSeconds']}s, {measured['input_i']} LUFS, {measured['input_tp']} dBTP")
    (output / 'manifest.json').write_text(json.dumps({'version': 1, 'sourceType': 'user-provided recordings', 'processing': 'Metadata removed; outer silence trim; 180 Hz high-pass; 5 kHz low-pass; 6 dB FFT noise reduction; gentle 2.2:1 compression; softened 8-bit blend at 20%; 11.025 kHz/24 kHz down-up sampling, faint 14 Hz modulation and short echo for low-volume retro game voice texture; two-pass -23 LUFS / -6 dBTP; edge fades; mono 24 kHz MP3.', 'clips': clips}, indent=2) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source_directory', type=Path)
    prepare(parser.parse_args().source_directory)
