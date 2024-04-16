import sys
import os

#chage path if necessary
path = os.getcwd()
parent = os.path.dirname(path)
file_dir = parent + "/../csv/"
files_in_dir = []

def main():
    for file in os.listdir():
        files_in_dir.append()
    print(files_in_dir)

if __name__ == "__main__":
    # args = sys.argv[1:]
    # testName = args[0]