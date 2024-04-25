import sys
import os
# uncomment if problems with dependencies
#%pip install pm4py
#%pip install pandas
import pm4py
import datetime as dt
import time
import pandas

#chage path if necessary
path = os.getcwd()
parent = os.path.dirname(path)
json_dir = parent + "/../../../test/json/"

def import_json_original(file_path):
    event_log = pandas.read_json(file_path)
    event_log['timestamp'] = pandas.to_datetime(event_log['timestamp'])
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def getStartActivities(event_log):
    s = pm4py.get_start_activities(event_log)
    print("Start activities: {}\n".format(s))
    return s

def getEndActivities(event_log):
    e = pm4py.get_end_activities(event_log)
    print("End activities: {}\n".format(e))
    return e

def getAttributeFromLog(event_log, attr):
    entries = pm4py.get_event_attribute_values(event_log, attr)
    print("Entries: {}\n".format(entries))
    return entries

def check_conformity(ccLog_before_transaction, new_ccLog):
    # # creates the Petri model from new_ccLog
    # net, initial_marking, final_marking = pm4py.discover_petri_net_inductive(new_ccLog)
    # # checks if the Petri model conforms to the rules of ccLog_before_transaction
    # aligned_traces = pm4py.conformance_diagnostics_alignments(ccLog_before_transaction, net, initial_marking, final_marking)
    # print("\naligned_traces:\n", aligned_traces)

def main():
    startTime = time.perf_counter()

    file_path = json_dir + file1
    if (not os.path.exists(file_path)):
        print(f"File '{file_path}' does not exist")
        exit()
    new_ccLog = import_json_original(file_path)
    
    print(file_path)
    print(new_ccLog)
    startAct = getStartActivities(new_ccLog)
    endAct = getEndActivities(new_ccLog)
    timestamps = getAttributeFromLog(new_ccLog, "timestamp")

    # process model from new_ccLog
    process_tree = pm4py.discover_process_tree_inductive(new_ccLog)
    print(process_tree)
    # ->( 'InitializeAsset', 'LockAsset', 'CreateAsset', *( 'TransferAsset', tau ), 'DeleteAsset' )

    # ccLog_before_transaction = import_json_original(file_path)
    # check if conforms with file1
    #     with open("process_tree.json", "w") as f:
    #         write the new process model on output_file
    # else:
    #     with open("process_tree.json", "w") as f:
    #         write cancel on output_file, so that hephaestus cancels the transaction?

    # while (stop condition not met):
        # repeat the above process

    endTime = time.perf_counter()
    timeTakenMs = endTime - startTime
    print(f"\nExecution Time (ms): {timeTakenMs*1000:0.3f}" )

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 print_all_cclogs.py file_to_create_model")
        exit()
    
    file1 = sys.argv[1]
    file2 = sys.argv[2]
    main()