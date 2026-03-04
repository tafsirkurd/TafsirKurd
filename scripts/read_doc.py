"""
Extract text from .doc (Word 97-2003 binary) using raw WordDocument stream.
Handles Arabic/Kurdish Unicode text via the FIB and text extraction.
"""
import sys, io, struct, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import olefile

DOC_PATH = "C:/TafsirKurd/scripts/hadiths_import.doc"

def extract_text_from_doc(path):
    """Extract all text from .doc using WordDocument stream."""
    ole = olefile.OleFileIO(path)

    # Read FIB (File Information Block) from WordDocument stream
    word_stream = ole.openstream('WordDocument').read()

    # FIB offset 0x18 = ccpText (length of main text)
    # FIB offset 0x0 = wIdent (should be 0xA5EC or 0xA5DC)
    wident = struct.unpack_from('<H', word_stream, 0)[0]
    print(f"wIdent: 0x{wident:04X}", file=sys.stderr)

    # Try to get the 1Table or 0Table stream for the character positions
    table_name = '1Table' if ole.exists('1Table') else '0Table'
    table_stream = ole.openstream(table_name).read()

    # From FIB: fcClx offset and length in table stream
    # These are at fixed offsets in the FIB
    fc_clx = struct.unpack_from('<I', word_stream, 0x01A2)[0]  # offset 418
    lcb_clx = struct.unpack_from('<I', word_stream, 0x01A6)[0]  # offset 422

    print(f"fcClx=0x{fc_clx:X}, lcbClx=0x{lcb_clx:X}", file=sys.stderr)

    # Read the Clx structure
    clx = table_stream[fc_clx:fc_clx + lcb_clx]

    # Parse Clx to get piece table (CPs and FCs)
    pieces = parse_clx(clx)

    # Extract text from each piece
    texts = []
    for (cp_start, cp_end, fc, is_unicode) in pieces:
        length = cp_end - cp_start
        if is_unicode:
            byte_len = length * 2
            raw = word_stream[fc:fc + byte_len]
            try:
                text = raw.decode('utf-16-le', errors='replace')
            except:
                text = ''
        else:
            byte_len = length
            raw = word_stream[fc:fc + byte_len]
            try:
                text = raw.decode('cp1256', errors='replace')  # Arabic Windows encoding
            except:
                text = raw.decode('latin-1', errors='replace')
        texts.append(text)

    return ''.join(texts)

def parse_clx(clx):
    """Parse the Clx structure to get piece table entries."""
    pieces = []
    i = 0

    # Skip property modifiers (grpprl)
    while i < len(clx):
        clxt = clx[i]
        i += 1
        if clxt == 0x02:  # PieceTable
            cb = struct.unpack_from('<I', clx, i)[0]
            i += 4
            piece_data = clx[i:i+cb]
            pieces = parse_piece_table(piece_data)
            break
        elif clxt == 0x01:  # property modifier
            cb = struct.unpack_from('<H', clx, i)[0]
            i += 2 + cb
        else:
            break

    return pieces

def parse_piece_table(data):
    """Parse PieceTable: CPs array followed by PCD array."""
    # Number of pieces: the CPs array has n+1 entries (4 bytes each)
    # We find n from: data layout = (n+1)*4 + n*8 bytes
    # Total = data length, solve: 4n+4 + 8n = len => 12n+4=len => n=(len-4)/12
    n = (len(data) - 4) // 12

    pieces = []
    cp_offset = 0
    pcd_offset = (n + 1) * 4

    cps = [struct.unpack_from('<I', data, cp_offset + i*4)[0] for i in range(n+1)]

    for i in range(n):
        pcd = data[pcd_offset + i*8: pcd_offset + i*8 + 8]
        # fc_value at offset 2 in PCD (4 bytes)
        fc_value = struct.unpack_from('<I', pcd, 2)[0]
        # Bit 30 indicates compressed (ANSI) if set = NOT unicode
        is_compressed = bool(fc_value & 0x40000000)
        fc = (fc_value & ~0x40000000)
        if is_compressed:
            fc = fc >> 1
            is_unicode = False
        else:
            is_unicode = True
        pieces.append((cps[i], cps[i+1], fc, is_unicode))

    return pieces

if __name__ == '__main__':
    try:
        text = extract_text_from_doc(DOC_PATH)
        # Write raw extracted text to file
        with open('C:/TafsirKurd/scripts/hadiths_raw.txt', 'w', encoding='utf-8') as f:
            f.write(text)
        lines = text.split('\r')
        print(f"Total chars: {len(text)}, lines: {len(lines)}")
        print("=== FIRST 3000 chars ===")
        print(text[:3000])
    except Exception as e:
        import traceback
        traceback.print_exc()
