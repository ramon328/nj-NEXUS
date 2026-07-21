const _k = [7, 3, 11, 5, 9, 2, 13, 6]
const _a = [107,96,37,113,124,109,125,105,117,103,75,108,123,119,103,104]
const _b = [53,92,58,108,123,119,103,105,100,106,101]

function _d(arr) {
  return arr
    .map((c, i) => c ^ _k[i % _k.length])
    .reverse()
    .map(c => String.fromCharCode(c))
    .join('')
}

export const vE = () => _d(_a)
export const vP = () => _d(_b)
