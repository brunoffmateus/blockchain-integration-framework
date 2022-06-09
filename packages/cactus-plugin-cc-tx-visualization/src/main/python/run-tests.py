import subprocess
import time
import sys
import os

# Input1: name of test file inside packages/cactus-plugin-cc-tx-visualization/src/test/typescript/integration
# Input2: number of test runs
# Output: test files corresponding to number of runs on packages/cactus-plugin-cc-tx-visualization/src/main/test-results  

def main():
    start = time.time()
    file = open(SAVE_STRING, "wb")

    process = subprocess.Popen(FULL_COMMAND.split(), cwd="/home/rbelchior/blockchain-integration-framework", stdout=subprocess.PIPE)
    output, error = process.communicate()
    print("error: \n {}", error)
    #outputText = sys.stdout.buffer.write(bytes(output,"utf-8"))
    file.write(output)
    file.close()

    end = time.time()

    print("\n==========")
    print("\nPartial Running time: {:01f}\n".format(end-start))


if __name__ == "__main__":
    args = sys.argv[1:]
    testName = args[0]
    numberTests = args[1]
    cumulativeTimeStart = time.time()
    TEST_EXTENSION = ".test.ts"
    OUTPUT_DIR = "packages/cactus-plugin-cc-tx-visualization/src/main/test-results/"
    TEST_DIR = "packages/cactus-plugin-cc-tx-visualization/src/test/typescript/integration/"
    # directory is given as input to subprocess
    VS_CODE_PARTIAL_SCRIPT = "npx tap --ts --timeout=600 "
    TARGET =  VS_CODE_PARTIAL_SCRIPT + TEST_DIR + testName + TEST_EXTENSION
    FULL_COMMAND = TARGET
    print("Running: ", FULL_COMMAND)

    runs = int(numberTests)
    while runs > 0:
        SAVE_STRING =  os.path.join("../", "test-results/") + testName + "-" + str(runs) + ".out"
        print("Saving out in:", SAVE_STRING)
        print("Iteration %\n ", runs)
        main()
        runs -= 1
    cumulativeTimeEnd = time.time()
    print("\n==========")
    print("\nTotal number of tests done:",numberTests )
    print("\n==========")
    print("\nType of tests done:",testName )
    print("\n==========")
    print("\nTotal Running time: {:01f}\n".format(cumulativeTimeEnd-cumulativeTimeStart))
