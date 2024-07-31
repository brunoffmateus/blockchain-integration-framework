import sys
import os
# uncomment if problems with dependencies
#%pip install pm4py
#%pip install pandas
import pm4py
import time
import pandas
import pickle
import json

#chage path if necessary
path = os.getcwd()
csv_dir_src = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/test/csv"
csv_dir_lib = path + "/packages/cactus-plugin-ccmodel-hephaestus/dist/lib/test/csv"
json_dir_src = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/test/json"
json_dir_lib = path + "/packages/cactus-plugin-ccmodel-hephaestus/dist/lib/test/json"

def import_csv_original(file_path):
    event_log = pandas.read_csv(file_path, sep=';')
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def import_json_original(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    event_log = pandas.DataFrame(data)
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

##################################################################

def create_and_serialize_model(ccLog):
    pn, im, fm = pm4py.discover_petri_net_inductive(ccLog)
    # pm4py.view_petri_net(pn, im, fm)
    return str(pn.places) + ";" + str(pn.transitions) + ";" + str(pn.arcs) + ";" + str(im) + ";" + str(fm)

##################################################################

def main():
    file_csv = file + ".csv"
    file_json = file + ".json"

    file_path_csv_src = os.path.join(csv_dir_src, file_csv)
    file_path_json_src = os.path.join(json_dir_src, file_json)
    file_path_csv_lib = os.path.join(csv_dir_lib, file_csv)
    file_path_json_lib = os.path.join(json_dir_lib, file_json)

    if (os.path.exists(file_path_json_src)):
        ccLog = import_json_original(file_path_json_src)
        serialized_model = create_and_serialize_model(ccLog)
        print(serialized_model)
    elif (os.path.exists(file_path_csv_src)):
        ccLog = import_csv_original(file_path_csv_src)
        serialized_model = create_and_serialize_model(ccLog)
        print(serialized_model)
    elif (os.path.exists(file_path_json_lib)):
        ccLog = import_json_original(file_path_json_lib)
        serialized_model = create_and_serialize_model(ccLog)
        print(serialized_model)
    elif (os.path.exists(file_path_csv_lib)):
        ccLog = import_csv_original(file_path_csv_lib)
        serialized_model = create_and_serialize_model(ccLog)
        print(serialized_model)
    else:
        print(f"File '{file}' does not exist")
        exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 create_model.py file_with_logs")
        exit(1)
    
    file = sys.argv[1]
    main()