/* MIT License
*
* Copyright (C) 2023 Jelmer van Arnhem
* Copyright (c) 2018 Akash Kurdekar
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/
"use strict"

/**
 * Compare two strings and return the match value between 0 and 1.
 * @param {string} first
 * @param {string} second
 */
const compareStrings = (first, second) => {
    if (first === second) {
        return 1
    }
    if (first.length < 2 || second.length < 2) {
        return 0
    }
    const firstBigrams = new Map()
    for (let i = 0; i < first.length - 1; i++) {
        const bigram = first.substring(i, i + 2)
        let count = 1
        if (firstBigrams.has(bigram)) {
            count = firstBigrams.get(bigram) + 1
        }
        firstBigrams.set(bigram, count)
    }
    let intersectionSize = 0
    for (let i = 0; i < second.length - 1; i++) {
        const bigram = second.substring(i, i + 2)
        let count = 0
        if (firstBigrams.has(bigram)) {
            count = firstBigrams.get(bigram)
        }
        if (count > 0) {
            firstBigrams.set(bigram, count - 1)
            intersectionSize += 1
        }
    }
    return 2.0 * intersectionSize / (first.length + second.length - 2)
}

module.exports = {compareStrings}
