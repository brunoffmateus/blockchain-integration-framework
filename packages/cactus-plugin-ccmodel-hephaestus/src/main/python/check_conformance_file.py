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
from pm4py.objects.petri_net.obj import PetriNet, Marking
from pm4py.objects.petri_net.utils import petri_utils

##################################################################

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

def unserialize_and_check_conformance(ccLog, path_to_ccmodel_file):
    (net, initial_marking, final_marking) = pm4py.read_pnml(path_to_ccmodel_file)
    # pm4py.view_petri_net(net, initial_marking, final_marking)

    # check  conformance:
    diagnostics = pm4py.conformance_diagnostics_alignments(ccLog, net, initial_marking, final_marking)
    if diagnostics == []:
        print("No event log provided")
        return

    alignment = diagnostics[0]["alignment"]
    conforming_activities = []
    non_conforming_activities = []
    skipped_activities = []
    all_activities = []

    for activity in alignment:
        if activity[0] == ">>" and activity[1] != None:
            all_activities.append(activity)
            skipped_activities.append(activity)
        elif activity[0] != ">>" and activity[1] == ">>":
            all_activities.append(activity)
            non_conforming_activities.append(activity)
        elif activity[0] != None and activity[1] != None:
            all_activities.append(activity)
            conforming_activities.append(activity)
            
    # Check for non-confomant behaviour
    if len(non_conforming_activities) != 0:
        print("NON-CONFORMANCE:")
        print(non_conforming_activities)
        print(os.path.basename(log_file_path))
        return

    if len(all_activities) == len(conforming_activities):
        print("FULL CONFORMANCE:")
        print(conforming_activities)
        print(os.path.basename(log_file_path))
        return

    # If there were no skips in the case, then all the conforming activities 
    # will be the same as the initial activities of the model
    # If not, then there were skips that cannot be ignored
    ignore_skips = True
    for i in range(len(conforming_activities)):
        if(conforming_activities[i] != all_activities[i]):
            ignore_skips = False

    if ignore_skips == True:
        print("PARTIAL CONFORMANCE:")
        print(conforming_activities)
        print(os.path.basename(log_file_path))
    else:
        print("SKIPPED ACTIVITY:")
        print(skipped_activities)
        print(os.path.basename(log_file_path))

##################################################################

def main():
    if not os.path.exists(log_file_path):
        print(f"Cross-chain Log file: '{log_file_path}' does not exist")
        exit(1)
    
    if not os.path.exists(path_to_ccmodel_file):
        print(f"Cross-chain Log file: '{path_to_ccmodel_file}' does not exist")
        exit(1)
        
    file_extension = os.path.splitext(log_file_path)[1].lower()
    
    if file_extension == '.csv':
        ccLog = import_csv_original(log_file_path)
        unserialize_and_check_conformance(ccLog, path_to_ccmodel_file)
    elif file_extension == '.json':
        ccLog = import_json_original(log_file_path)
        unserialize_and_check_conformance(ccLog, path_to_ccmodel_file)
    else:
        print(f"Unsupported file type: {file_extension}")
        exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 check_conformance.py path_to_log_file path_to_ccmodel_file")
        exit(1)
    
    log_file_path = sys.argv[1]
    path_to_ccmodel_file = sys.argv[2]
    main()